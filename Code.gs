function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
  Logger.log("ERROR: No POST data received.");
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "error",
      message: "No POST data received. Submit through the website."
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
   Logger.log("========== NEW SUBMISSION ==========");
  

  try {
     // 1. Acquire lock
    lockAcquired = lock.tryLock(10000);

    if (!lockAcquired) {
      throw new Error("Could not acquire script lock.");
    }
    // 1. Open spreadsheet explicitly using its ID
    var SPREADSHEET_ID = "1RVwfWUEYVm1dgXTGhJ2KTDOmOqcRAmkXyJZqgyHGo54"; 
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 2. Get or create the 'Client Submissions' tab
    var sheet = ss.getSheetByName("Client Submissions");
    if (!sheet) {
      sheet = ss.insertSheet("Client Submissions");
      sheet.appendRow([
        "Timestamp", "Service", "Full Name", "Date of Birth", 
        "Email", "Phone", "Emergency Contact", "Emergency Phone", 
        "Medical Conditions", "Medications/Allergies", "Photo Consent", "Signature"
      ]);
    }

    // 3. Parse incoming JSON data
    var data = JSON.parse(e.postData.contents);
    var timestamp = new Date();
    
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
      // data.signature ? "Signature received" : "No Signature"
      data.signature || "No Signature"
    ];

    sheet.appendRow(rowData);

     // 4. Send Email Notification
    var recipientEmail = "kamran.jivehire@gmail.com";
    // var ccEmails = "cc1@example.com, cc2@example.com"; // CC recipients
    // var bccEmails = "kamran.cs321+Inaya@gmail.com"; // BCC recipients
    // var customerName = data.fullName || "Unknown Customer";
    var subject = "New Client Submission: " + (data.fullName || "N/A");
    var htmlBody = `
      <h2>New Client Submission Details</h2>
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
    `;
    try {
      sendSubmissionEmail(
        recipientEmail,
        subject,
        "A new client submission has been received for " + (data.fullName || "N/A"),
        htmlBody
      );
    } catch (mailError) {
      Logger.log("SUBMISSION EMAIL FAILED: " + mailError.message);
      try {
        MailApp.sendEmail({
          to: "kamran.jivehire@gmail.com",
          subject: "Wonderbrows: submission email failed",
          body: "The form was saved, but its notification email could not be sent.\n\n"
            + "Intended recipient: " + recipientEmail + "\n"
            + "Time: " + timestamp.toISOString() + "\n"
            + "Error: " + mailError.message
        });
        Logger.log("EMAIL FAILURE DIAGNOSTIC SENT to kamran.jivehire@gmail.com");
      } catch (diagnosticError) {
        Logger.log("EMAIL FAILURE DIAGNOSTIC FAILED: " + diagnosticError.message);
      }
      throw mailError;
    }
    Logger.log("Actual signature: " + (data.signature ? "Received" : "Missing"));
    // 5. Return formatted JSON response
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() })).setMimeType(ContentService.MimeType.JSON);
 Logger.log("EMAIL/SUBMISSION ERROR: " + err.message);
  Logger.log("STACK: " + err.stack);

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    }))
    .setMimeType(ContentService.MimeType.JSON);
  } finally {
     if (lockAcquired) {
    lock.releaseLock();
  }
  }
}

function sendSubmissionEmail(recipient, subject, body, htmlBody) {
  try {
    Logger.log("Remaining daily quota: " + MailApp.getRemainingDailyQuota());
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      name: "Wonderbrows by Nay"
    });
    Logger.log("SUBMISSION EMAIL SENT to " + recipient);
  } catch (err) {
    Logger.log("SUBMISSION EMAIL FAILED: " + err.message);
    throw err;
  }
}

function testEmailDelivery() {
  var recipient = "kamran.jivehire@gmail.com";
  try {
    Logger.log("Starting independent email test");
    sendSubmissionEmail(
      recipient,
      "Wonderbrows - Email Delivery Test",
      "Testing Google Apps Script email delivery.",
      "<h2>Email test successful</h2><p>Google Apps Script is sending emails.</p>"
    );
    Logger.log("EMAIL TEST COMPLETED SUCCESSFULLY");
  } catch (err) {
    Logger.log("EMAIL TEST FAILED: " + err.message);
    throw err;
  }
}
function testPermissions() {
  var ss = SpreadsheetApp.openById("1RVwfWUEYVm1dgXTGhJ2KTDOmOqcRAmkXyJZqgyHGo54");
  Logger.log(ss.getName());
}