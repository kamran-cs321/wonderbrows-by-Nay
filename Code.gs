function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
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
      data.signature || ""
    ];

    sheet.appendRow(rowData);

    // 4. Return formatted JSON response
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
function testPermissions() {
  var ss = SpreadsheetApp.openById("1RVwfWUEYVm1dgXTGhJ2KTDOmOqcRAmkXyJZqgyHGo54");
  Logger.log(ss.getName());
}