/**
 * Wonderbrows - Client Submission Handler
 *
 * Responsibilities:
 * 1. Receive website form submission.
 * 2. Save submission to Google Sheets.
 * 3. Send email notification.
 * 4. Return independent submission/email statuses.
 */

function doPost(e) {

  var SPREADSHEET_ID =
    "1RVwfWUEYVm1dgXTGhJ2KTDOmOqcRAmkXyJZqgyHGo54";

  var SHEET_NAME = "Client Submissions";
  var RECIPIENT_EMAIL = "Wonderbrowsbynay@yahoo.com";

  var saved = false;
  var emailStatus = "not_attempted";
  var emailError = "";

  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  Logger.log("========== NEW SUBMISSION ==========");

  try {

    // 1. Validate incoming request

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST data received.");
    }

    // 2. Parse JSON

    var data = JSON.parse(e.postData.contents);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid submission data.");
    }

    var timestamp = new Date();

    // 3. Acquire lock

    lockAcquired = lock.tryLock(10000);

    if (!lockAcquired) {
      throw new Error("Could not acquire script lock.");
    }

    // 4. Open spreadsheet

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    var sheet = ss.getSheetByName(SHEET_NAME);

    // 5. Create sheet if missing

    var headers = [
      "Timestamp",
      "Service",
      "Full Name",
      "Date of Birth",
      "Email",
      "Phone",
      "Emergency Contact",
      "Emergency Phone",
      "Medical Conditions",
      "Medications/Allergies",
      "Photo Consent",
      "Signature"
    ];

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Ensure headers exist

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    // 6. Prepare submission data

    var rowData = [
      timestamp,
      data.serviceType || "",
      data.fullName || "",
      data.dob || "",
      data.email || "",
      data.phone || "",
      data.emergencyContact || "",
      data.emergencyPhone || "",
      data.medicalHistory || "",
      data.medicationsList || "",
      data.photoConsent || "",
      data.signature || "No Signature"
    ];

    // 7. Save submission

    sheet.appendRow(rowData);

    saved = true;

    Logger.log("SUBMISSION SAVED SUCCESSFULLY");

    // 8. Release lock before sending email

    lock.releaseLock();
    lockAcquired = false;

    // 9. Prepare notification email
/*
    var subject =
      "New Client Submission: " +
      (data.fullName || "N/A");

    // Send only essential information.
    // Complete client details remain in Google Sheets.

    var htmlBody = `
      <h2>New Client Submission Received</h2>

      <p>A new client submission has been saved.</p>

       <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; family: Arial, sans-serif;">
        <tr><td><strong>Timestamp</strong></td><td>${timestamp.toLocaleString()}</td></tr>
        <tr><td><strong>Service</strong></td><td>${data.serviceType || ""}</td></tr>
        <tr><td><strong>Full Name</strong></td><td>${data.fullName || ""}</td></tr>
        <tr><td><strong>Date of Birth</strong></td><td>${data.dob || ""}</td></tr>
        <tr><td><strong>Email</strong></td><td>${data.email || ""}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${data.phone || ""}</td></tr>
        <tr><td><strong>Emergency Contact</strong></td><td>${data.emergencyContact || ""}</td></tr>
        <tr><td><strong>Emergency Phone</strong></td><td>${data.emergencyPhone || ""}</td></tr>
        <tr><td><strong>Medical Conditions</strong></td><td>${data.medicalHistory || ""}</td></tr>
        <tr><td><strong>Medications/Allergies</strong></td><td>${data.medicationsList || ""}</td></tr>
        <tr><td><strong>Photo Consent</strong></td><td>${data.photoConsent || ""}</td></tr>
        <tr>
          <td><strong>Signature</strong></td>
          <td>${data.signature ? "Received (saved with submission)." : "Not provided."}</td>
        </tr>
       
      </table>

      <p>
        Please access the Google Sheet to review
        the complete submission.
      </p>
    `;

    var plainBody =
      "A new client submission has been saved.\n\n" +
      "Client: " + (data.fullName || "N/A") + "\n" +
      "Service: " + (data.serviceType || "N/A") + "\n" +
      "Time: " + timestamp.toISOString() + "\n\n" +
      "Please review the Google Sheet for complete details.";
*/


    // 9. Prepare professional notification email

    var subject =
      "New Client Submission | " +
      (data.fullName || "New Client");

    // Format timestamp using the script's configured timezone.
    var formattedTimestamp = Utilities.formatDate(
      timestamp,
      Session.getScriptTimeZone(),
      "dd MMM yyyy, hh:mm a"
    );

    // Convert the submitted Base64 signature into an inline PNG.
    // This keeps the signature inside the email without public file sharing.
    var signatureBlob = null;

    if (
      data.signature &&
      typeof data.signature === "string"
    ) {
      var signatureMatch = data.signature.match(
        /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/
      );

      if (signatureMatch) {
        try {
          var signatureBytes = Utilities.base64Decode(
            signatureMatch[1]
          );

          signatureBlob = Utilities.newBlob(
            signatureBytes,
            "image/png",
            "client-signature.png"
          );
        } catch (signatureError) {
          Logger.log(
            "SIGNATURE IMAGE PROCESSING FAILED: " +
            signatureError.message
          );
        }
      }
    }

    // Escape all user-provided values before inserting them into HTML.
    function emailValue(value) {
      var safeValue = escapeHtml(
        value === undefined || value === null || value === ""
          ? "Not provided"
          : value
      );

      return safeValue.replace(/\r?\n/g, "<br>");
    }

    // Reusable professional table row.
    function emailRow(label, value) {
      return `
        <tr>
          <td style="
            width: 36%;
            padding: 11px 14px;
            background-color: #f8f6f2;
            border-bottom: 1px solid #e9e4dc;
            color: #655e53;
            font-size: 13px;
            font-weight: 600;
            vertical-align: top;
          ">
            ${escapeHtml(label)}
          </td>
          <td style="
            padding: 11px 14px;
            border-bottom: 1px solid #e9e4dc;
            color: #292622;
            font-size: 13px;
            line-height: 1.6;
            vertical-align: top;
            overflow-wrap: anywhere;
          ">
            ${emailValue(value)}
          </td>
        </tr>
      `;
    }

    var clientRows = [
      emailRow("Full Name", data.fullName),
      emailRow("Service", data.serviceType),
      emailRow("Date of Birth", data.dob),
      emailRow("Email Address", data.email),
      emailRow("Phone Number", data.phone),
      emailRow("Emergency Contact", data.emergencyContact),
      emailRow("Emergency Phone", data.emergencyPhone),
      emailRow("Medical Conditions", data.medicalHistory),
      emailRow("Medications / Allergies", data.medicationsList),
      emailRow("Photo & Video Consent", data.photoConsent)
    ].join("");

    var signatureHtml = data.signature
      ? `
        <div style="
          padding: 18px;
          background-color: #ffffff;
          border: 1px solid #e9e4dc;
          border-radius: 6px;
          text-align: center;
        ">
         <pre>${escapeHtml(data.signature)}</pre>
          
        </div>
      `
      : `
        <p style="color: #991b1b; font-size: 13px;">
          Signature image could not be processed. Please review the
          original submission in Google Sheets.
        </p>
      `;

    var htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="
        margin: 0;
        padding: 24px 12px;
        background-color: #f5f3ef;
        font-family: Arial, Helvetica, sans-serif;
        color: #292622;
      ">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width: 680px; margin: 0 auto;"
        >
          <tr>
            <td>

              <!-- Email Header -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color: #211f1b;
                  border-radius: 8px 8px 0 0;
                "
              >
                <tr>
                  <td style="padding: 28px 30px; text-align: center;">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-family: Georgia, serif;
                      font-size: 27px;
                      font-weight: normal;
                      letter-spacing: 2px;
                    ">
                      WONDERBROWS BY NAY
                    </h1>

                    <p style="
                      margin: 9px 0 0;
                      color: #d5b77e;
                      font-size: 10px;
                      letter-spacing: 2px;
                      text-transform: uppercase;
                    ">
                      Client Management · Submission Notification
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Main Content -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="background-color: #ffffff;"
              >
                <tr>
                  <td style="padding: 30px;">

                    <h2 style="
                      margin: 0 0 10px;
                      color: #292622;
                      font-family: Georgia, serif;
                      font-size: 23px;
                      font-weight: normal;
                    ">
                      New Client Submission Received
                    </h2>

                    <p style="
                      margin: 0 0 24px;
                      color: #716b62;
                      font-size: 13px;
                      line-height: 1.7;
                    ">
                      A new client intake and consent form has been
                      submitted and saved successfully.
                    </p>

                    <!-- Submission Metadata -->
                    <div style="
                      margin-bottom: 24px;
                      padding: 13px 16px;
                      background-color: #faf7f1;
                      border-left: 3px solid #c5a059;
                    ">
                      <p style="
                        margin: 0;
                        color: #655e53;
                        font-size: 12px;
                      ">
                        <strong>Submission received:</strong>
                        ${escapeHtml(formattedTimestamp)}
                      </p>
                    </div>

                    <!-- Client Details -->
                    <h3 style="
                      margin: 0 0 12px;
                      padding-bottom: 9px;
                      border-bottom: 1px solid #c5a059;
                      color: #292622;
                      font-size: 14px;
                      letter-spacing: 1px;
                      text-transform: uppercase;
                    ">
                      Client Information
                    </h3>

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        border: 1px solid #e9e4dc;
                        border-collapse: collapse;
                        margin-bottom: 28px;
                      "
                    >
                      ${clientRows}
                    </table>

                    <!-- Client Signature -->
                    <h3 style="
                      margin: 0 0 12px;
                      padding-bottom: 9px;
                      border-bottom: 1px solid #c5a059;
                      color: #292622;
                      font-size: 14px;
                      letter-spacing: 1px;
                      text-transform: uppercase;
                    ">
                      Client Authorization & Signature
                    </h3>

                    ${data.signature}

                    <!-- Review Reminder -->
                    <div style="
                      margin-top: 28px;
                      padding: 17px;
                      background-color: #f8f6f2;
                      border-radius: 5px;
                    ">
                      <p style="
                        margin: 0;
                        color: #655e53;
                        font-size: 12px;
                        line-height: 1.7;
                      ">
                        <strong>Next step:</strong>
                        Please review the complete submission and
                        supporting information in the
                        <strong>Client Submissions</strong> Google Sheet.
                      </p>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color: #211f1b;
                  border-radius: 0 0 8px 8px;
                "
              >
                <tr>
                  <td style="
                    padding: 20px;
                    text-align: center;
                  ">
                    <p style="
                      margin: 0;
                      color: #d5b77e;
                      font-family: Georgia, serif;
                      font-size: 15px;
                    ">
                      Wonderbrows by Nay
                    </p>

                    <p style="
                      margin: 8px 0 0;
                      color: #c5c0b7;
                      font-size: 10px;
                      line-height: 1.6;
                    ">
                      This is an automated submission notification.
                      Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

    var plainBody =
      "WONDERBROWS BY NAY\n" +
      "NEW CLIENT SUBMISSION\n\n" +
      "Submission received: " + formattedTimestamp + "\n\n" +
      "CLIENT INFORMATION\n" +
      "Name: " + (data.fullName || "Not provided") + "\n" +
      "Service: " + (data.serviceType || "Not provided") + "\n" +
      "Date of Birth: " + (data.dob || "Not provided") + "\n" +
      "Email: " + (data.email || "Not provided") + "\n" +
      "Phone: " + (data.phone || "Not provided") + "\n" +
      "Emergency Contact: " + (data.emergencyContact || "Not provided") + "\n" +
      "Emergency Phone: " + (data.emergencyPhone || "Not provided") + "\n" +
      "Medical Conditions: " + (data.medicalHistory || "Not provided") + "\n" +
      "Medications / Allergies: " + (data.medicationsList || "Not provided") + "\n" +
      "Photo Consent: " + (data.photoConsent || "Not provided") + "\n\n" +
      "Signature: " +
      (signatureBlob ? "Attached inline in the HTML email." : "Could not be processed.") +
      "\n\nPlease review the complete submission in the Client Submissions Google Sheet.";

    // Add the signature as an inline image only when valid.
    var inlineImages = {};

    if (signatureBlob) {
      inlineImages.clientSignature = signatureBlob;
    }

    // 10. Send notification independently

    try {
// const signatureBase64 = signature.replace(
//   /^data:image\/\w+;base64,/,
//   ''
// );

// const signatureBlob = Utilities.newBlob(
//   Utilities.base64Decode(signatureBase64),
//   'image/png',
//   'client-signature.png'
// );
      sendSubmissionEmail(
        RECIPIENT_EMAIL,
        subject,
        plainBody,
        htmlBody
      );

      emailStatus = "accepted";

      Logger.log(
        "EMAIL_SEND_ACCEPTED: " + RECIPIENT_EMAIL
      );

    } catch (mailError) {

      emailStatus = "failed";
      emailError = mailError.message;

      Logger.log("EMAIL_NOTIFICATION_FAILED");
      Logger.log("ERROR: " + emailError);
      Logger.log("STACK: " + mailError.stack);

    }

    // 11. Return response

    return ContentService
      .createTextOutput(JSON.stringify({

        status: "success",
        saved: saved,
        emailStatus: emailStatus,

        message: emailStatus === "accepted"
          ? "Submission saved and email sending accepted."
          : "Submission saved, but email notification failed.",

        emailError: emailError || undefined

      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    Logger.log("SUBMISSION PROCESSING ERROR: " + err.message);
    Logger.log("STACK: " + err.stack);

    return ContentService
      .createTextOutput(JSON.stringify({

        status: "error",
        saved: saved,
        emailStatus: emailStatus,
        message: err.message

      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {

    // Release lock if still acquired

    if (lockAcquired) {
      lock.releaseLock();
    }

  }
}


/**
 * Escape HTML to prevent user input from
 * being interpreted as HTML markup.
 */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/**
 * Send submission notification.
 */

function sendSubmissionEmail(
  recipient,
  subject,
  body,
  htmlBody
) {

  var remainingQuota =
    MailApp.getRemainingDailyQuota();

  Logger.log("Remaining email quota: " + remainingQuota);

  if (remainingQuota < 1) {
    throw new Error("Google Apps Script email quota exhausted.");
  }

  MailApp.sendEmail({

    to: recipient,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "Wonderbrows by Nay"

  });

  Logger.log(
    "EMAIL_SEND_ACCEPTED: " + recipient
  );

}


/**
 * Independent email delivery test.
 */

function testEmailDelivery() {

  var recipient = "Wonderbrowsbynay@yahoo.com";

  Logger.log("========== EMAIL TEST ==========");

  try {

    sendSubmissionEmail(

      recipient,

      "Wonderbrows - Email Delivery Test",

      "Testing Google Apps Script email sending.",

      "<h2>Email Test</h2>" +
      "<p>Google Apps Script accepted the email send request.</p>"

    );

    Logger.log("EMAIL TEST COMPLETED");

  } catch (err) {

    Logger.log("EMAIL TEST FAILED: " + err.message);

    throw err;

  }

}


/**
 * Spreadsheet permission test.
 */

function testPermissions() {

  var ss = SpreadsheetApp.openById(
    "1RVwfWUEYVm1dgXTGhJ2KTDOmOqcRAmkXyJZqgyHGo54"
  );

  Logger.log("Spreadsheet access successful.");
  Logger.log("Spreadsheet: " + ss.getName());

}