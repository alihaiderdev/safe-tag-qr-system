// ============================================================
// SafeTag – Google Apps Script Backend
// File: Code.gs
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Open Google Sheets → Extensions → Apps Script
// 2. Paste this entire code
// 3. Update the CONFIG section below
// 4. Run setupSheets() once to create all required sheets
// 5. Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy the Web App URL and paste into your HTML files
// ============================================================

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  LANDING_PAGE_URL: 'https://alihaiderdev.github.io/safe-tag-qr-system/landing',
  ALERT_FORM_URL:   'https://alihaiderdev.github.io/safe-tag-qr-system/alert',

  // Email settings
  SEND_EMAIL_ALERTS: true,
  EMAIL_SUBJECT_PREFIX: '🚨 SafeTag Alert',

  // SMS via WhatsApp (optional – requires Twilio/WhatsApp API)
  SEND_SMS_ALERTS: false,
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_FROM_NUMBER: '',

  // ID Prefixes per category
  ID_PREFIXES: {
    'Individual': 'PP',
    'Vehicle':    'VH',
    'Pet':        'PT'
  },

  // Sheet names
  SHEETS: {
    INDIVIDUAL: 'Individual_Registrations',
    VEHICLE:    'Vehicle_Registrations',
    PET:        'Pet_Registrations',
    ALERTS:     'Alert_Log',
    ID_MAP:     'ID_Mapping_Print',
    COUNTERS:   'Counters'
  }
};

// ============================================================
// MAIN ENTRY POINT – handles all POST requests
// ============================================================
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // const data = JSON.parse(e.postData.contents);
    let data;
    // JSON aaya ya form-encoded?
    if (e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    let result;

    if (data.action === 'sendAlert') {
      result = processAlert(data);
    } else {
      result = processRegistration(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'SafeTag API running ✅' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// REGISTRATION PROCESSING
// ============================================================
function processRegistration(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const category = data.category;

  // Generate Unique ID
  const uniqueId = generateUniqueId(ss, category);

  // Build QR Code URL
  const landingUrl = CONFIG.LANDING_PAGE_URL + '?ID=' + uniqueId;
  const qrUrl = 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=' + encodeURIComponent(landingUrl);
  const alertUrl = CONFIG.ALERT_FORM_URL + '?ID=' + uniqueId;

  const timestamp = new Date();

  if (category === 'Individual') {
    writeIndividual(ss, data, uniqueId, qrUrl, alertUrl, timestamp);
  } else if (category === 'Vehicle') {
    writeVehicle(ss, data, uniqueId, qrUrl, alertUrl, timestamp);
  } else if (category === 'Pet') {
    writePet(ss, data, uniqueId, qrUrl, alertUrl, timestamp);
  }

  // Write to ID Mapping sheet (for printing)
  writeIdMap(ss, uniqueId, data.name || data.owner || data.petName, category, landingUrl, qrUrl, timestamp);

  // Send confirmation email to owner
  if (CONFIG.SEND_EMAIL_ALERTS && data.email) {
    sendConfirmationEmail(data, uniqueId, qrUrl, landingUrl);
  }

  return { success: true, uniqueId: uniqueId, qrUrl: qrUrl, landingUrl: landingUrl };
}

// ============================================================
// INDIVIDUAL REGISTRATION – writes to sheet
// ============================================================
function writeIndividual(ss, d, uid, qrUrl, alertUrl, ts) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INDIVIDUAL);
  if (!sheet) return;

  sheet.appendRow([
    uid,
    ts,
    d.name || '',
    d.cnic || '',
    d.phone || '',
    d.email || '',
    d.bloodGroup || '',
    d.address || '',
    d.ec1Name || '',
    d.ec1Relation || '',
    d.ec1Phone || '',
    d.ec1Email || '',
    d.ec2Name || '',
    d.ec2Relation || '',
    d.ec2Phone || '',
    d.ec2Email || '',
    qrUrl,
    alertUrl,
    'Active'
  ]);
}

// ============================================================
// VEHICLE REGISTRATION – writes to sheet
// ============================================================
function writeVehicle(ss, d, uid, qrUrl, alertUrl, ts) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.VEHICLE);
  if (!sheet) return;

  sheet.appendRow([
    uid,
    ts,
    d.plate || '',
    d.model || '',
    d.owner || '',
    d.cnic || '',
    d.phone || '',
    d.email || '',
    d.color || '',
    d.vehicleType || '',
    d.notes || '',
    qrUrl,
    alertUrl,
    'Active'
  ]);
}

// ============================================================
// PET REGISTRATION – writes to sheet
// ============================================================
function writePet(ss, d, uid, qrUrl, alertUrl, ts) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PET);
  if (!sheet) return;

  sheet.appendRow([
    uid,
    ts,
    d.name || '',
    d.petType || '',
    d.breed || '',
    d.age || '',
    d.petColor || '',
    d.owner || '',
    d.phone || '',
    d.email || '',
    d.medical || '',
    qrUrl,
    alertUrl,
    'Active'
  ]);
}

// ============================================================
// ID MAPPING – for print shop
// ============================================================
function writeIdMap(ss, uid, name, category, landingUrl, qrUrl, ts) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ID_MAP);
  if (!sheet) return;

  sheet.appendRow([
    uid,
    name || '',
    category,
    landingUrl,
    qrUrl,
    '=IMAGE("' + qrUrl + '")',
    ts,
    'Pending Print'
  ]);
}

// ============================================================
// ALERT PROCESSING – when helper scans QR and submits
// ============================================================
function processAlert(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const uniqueId = data.uniqueId;

  // Log the alert
  logAlert(ss, data);

  // Find owner info from the ID
  const ownerInfo = findOwnerByUniqueId(ss, uniqueId);

  if (ownerInfo) {
    // Send notification email
    if (CONFIG.SEND_EMAIL_ALERTS && ownerInfo.email) {
      sendAlertEmail(ownerInfo, data);
    }

    // Send SMS (if configured)
    if (CONFIG.SEND_SMS_ALERTS && ownerInfo.phone) {
      sendSmsAlert(ownerInfo, data);
    }

    // Also notify emergency contacts if it's an Individual and it's emergency
    if (ownerInfo.category === 'Individual' && 
        (data.alertType.includes('Emergency') || data.alertType.includes('Medical') || data.alertType.includes('Accident'))) {
      if (ownerInfo.ec1Email) {
        sendAlertEmail({ name: ownerInfo.ec1Name, email: ownerInfo.ec1Email, relation: ownerInfo.ec1Relation }, data, ownerInfo.name);
      }
      if (ownerInfo.ec2Email) {
        sendAlertEmail({ name: ownerInfo.ec2Name, email: ownerInfo.ec2Email, relation: ownerInfo.ec2Relation }, data, ownerInfo.name);
      }
    }
  }

  return { success: true, message: 'Alert sent successfully.' };
}

// ============================================================
// LOG ALERT to sheet
// ============================================================
function logAlert(ss, d) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ALERTS);
  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    d.uniqueId || '',
    d.alertType || '',
    d.urgency || '',
    d.description || '',
    d.helperName || 'Anonymous',
    d.helperPhone || '',
    d.location || '',
    d.locationCoords || '',
    d.timestamp || ''
  ]);
}

// ============================================================
// FIND OWNER BY UNIQUE ID
// ============================================================
function findOwnerByUniqueId(ss, uniqueId) {
  const prefix = uniqueId.split('-')[0];

  let sheetName, result;

  if (prefix === 'PP') {
    sheetName = CONFIG.SHEETS.INDIVIDUAL;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === uniqueId) {
        return {
          category:   'Individual',
          uniqueId:   rows[i][0],
          name:       rows[i][2],
          cnic:       rows[i][3],
          phone:      rows[i][4],
          email:      rows[i][5],
          bloodGroup: rows[i][6],
          ec1Name:    rows[i][8],
          ec1Relation:rows[i][9],
          ec1Phone:   rows[i][10],
          ec1Email:   rows[i][11],
          ec2Name:    rows[i][12],
          ec2Email:   rows[i][15]
        };
      }
    }
  } else if (prefix === 'VH') {
    sheetName = CONFIG.SHEETS.VEHICLE;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === uniqueId) {
        return {
          category: 'Vehicle',
          uniqueId: rows[i][0],
          plate:    rows[i][2],
          model:    rows[i][3],
          name:     rows[i][4],
          phone:    rows[i][6],
          email:    rows[i][7]
        };
      }
    }
  } else if (prefix === 'PT') {
    sheetName = CONFIG.SHEETS.PET;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === uniqueId) {
        return {
          category: 'Pet',
          uniqueId: rows[i][0],
          name:     rows[i][2],
          owner:    rows[i][7],
          phone:    rows[i][8],
          email:    rows[i][9]
        };
      }
    }
  }

  return null;
}

// ============================================================
// SEND ALERT EMAIL TO OWNER
// ============================================================
function sendAlertEmail(owner, alertData, registeredName) {
  if (!owner.email) return;

  const displayName = registeredName || owner.name || 'Unknown';
  const subject = CONFIG.EMAIL_SUBJECT_PREFIX + ': ' + alertData.uniqueId + ' – ' + alertData.alertType;

  const body = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f4f6fb; padding: 20px;">

<div style="background: #e63946; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
  <h1 style="margin: 0; font-size: 22px;">🚨 SafeTag Emergency Alert</h1>
  <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">An alert has been triggered for your SafeTag ID</p>
</div>

<div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #eee; width: 40%;">SafeTag ID</td>
      <td style="padding: 10px 0; font-size: 15px; font-weight: 700; color: #4a6cf7; border-bottom: 1px solid #eee;">${alertData.uniqueId}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #eee;">Issue Type</td>
      <td style="padding: 10px 0; font-size: 15px; font-weight: 600; color: #e63946; border-bottom: 1px solid #eee;">${alertData.alertType}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #eee;">Urgency</td>
      <td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #eee;">${alertData.urgency || 'Not specified'}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #eee;">Reported By</td>
      <td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #eee;">${alertData.helperName || 'Anonymous'} ${alertData.helperPhone ? '(' + alertData.helperPhone + ')' : ''}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #eee;">Location</td>
      <td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #eee;">${alertData.location || 'Not provided'}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; font-size: 13px; color: #888;">Time</td>
      <td style="padding: 10px 0; font-size: 14px;">${new Date().toLocaleString('en-PK', {timeZone: 'Asia/Karachi'})}</td>
    </tr>
  </table>

  ${alertData.description ? `
  <div style="background: #fff8f0; border: 1px solid #ffd7a0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
    <strong style="font-size: 13px; color: #e07b00;">Description:</strong>
    <p style="margin: 6px 0 0; font-size: 14px; color: #555;">${alertData.description}</p>
  </div>
  ` : ''}

  ${alertData.locationCoords ? `
  <a href="https://maps.google.com/?q=${alertData.locationCoords}" 
     style="display: block; background: #4a6cf7; color: white; text-align: center; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 20px;">
    📍 Open Location on Google Maps
  </a>
  ` : ''}

  <p style="font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px;">
    This is an automated alert from SafeTag Emergency Response System.<br>
    Please take immediate action if required.
  </p>
</div>

</body>
</html>
  `;

  try {
    GmailApp.sendEmail(owner.email, subject, '', { htmlBody: body });
  } catch (err) {
    Logger.log('Email error: ' + err.message);
  }
}

// ============================================================
// SEND CONFIRMATION EMAIL AFTER REGISTRATION
// ============================================================
function sendConfirmationEmail(data, uniqueId, qrUrl, landingUrl) {
  if (!data.email) return;

  const subject = '✅ SafeTag Registration Confirmed – ' + uniqueId;
  const body = `
<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f4f6fb; padding: 20px;">

<div style="background: #1a2744; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
  <h1 style="margin: 0; font-size: 22px;">🏷️ SafeTag Registered!</h1>
  <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">Your ID has been created successfully</p>
</div>

<div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
  
  <p style="font-size: 15px; margin-bottom: 20px;">
    Assalam u Alaikum <strong>${data.name || data.owner || ''}</strong>,<br><br>
    Your SafeTag registration is complete. Here is your unique ID and QR code.
  </p>

  <div style="text-align: center; background: #f0f4ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <p style="font-size: 13px; color: #888; margin: 0 0 8px;">YOUR SAFETAG ID</p>
    <p style="font-size: 36px; font-weight: 800; color: #4a6cf7; letter-spacing: 3px; margin: 0 0 16px;">${uniqueId}</p>
    <img src="${qrUrl}" alt="QR Code" style="width: 180px; height: 180px; border: 2px solid #dde2ef; border-radius: 8px;">
    <p style="font-size: 12px; color: #aaa; margin: 10px 0 0;">Print and stick this QR sticker on your ID/vehicle/pet tag</p>
  </div>

  <div style="background: #fff8f0; border: 1px solid #ffd7a0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <strong style="color: #e07b00;">ℹ️ How it works:</strong>
    <ol style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #555; line-height: 1.8;">
      <li>Print or save your QR sticker</li>
      <li>Stick it on your ID card, vehicle, or pet collar</li>
      <li>If someone finds you in an emergency, they scan the QR</li>
      <li>You get an instant email/SMS alert</li>
    </ol>
  </div>

  <p style="font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px;">
    Your personal data is private and secure. Only alerts are sent to you.<br>
    SafeTag – Emergency Response System
  </p>
</div>

</body>
</html>
  `;

  try {
    GmailApp.sendEmail(data.email, subject, '', { htmlBody: body });
  } catch (err) {
    Logger.log('Confirmation email error: ' + err.message);
  }
}

// ============================================================
// SEND SMS VIA TWILIO (optional)
// ============================================================
function sendSmsAlert(owner, alertData) {
  if (!CONFIG.TWILIO_ACCOUNT_SID) return;
  
  const message = `SAFETAG ALERT!\nID: ${alertData.uniqueId}\nIssue: ${alertData.alertType}\nUrgency: ${alertData.urgency}\nLocation: ${alertData.location || 'N/A'}\nReporter: ${alertData.helperPhone || 'Anonymous'}`;

  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + CONFIG.TWILIO_ACCOUNT_SID + '/Messages.json';
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(CONFIG.TWILIO_ACCOUNT_SID + ':' + CONFIG.TWILIO_AUTH_TOKEN)
    },
    payload: {
      'From': CONFIG.TWILIO_FROM_NUMBER,
      'To': '+92' + owner.phone.replace(/^0/, ''),
      'Body': message
    }
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    Logger.log('SMS error: ' + err.message);
  }
}

// ============================================================
// GENERATE UNIQUE ID
// ============================================================
function generateUniqueId(ss, category) {
  const countersSheet = ss.getSheetByName(CONFIG.SHEETS.COUNTERS);
  if (!countersSheet) return 'ERR-0000';

  const rows = countersSheet.getDataRange().getValues();
  let rowIndex = -1;
  let currentCount = 1000;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === category) {
      rowIndex = i + 1;
      currentCount = rows[i][1];
      break;
    }
  }

  const newCount = currentCount + 1;
  if (rowIndex > 0) {
    countersSheet.getRange(rowIndex, 2).setValue(newCount);
  }

  const prefix = CONFIG.ID_PREFIXES[category] || 'XX';
  return prefix + '-' + newCount;
}

// ============================================================
// INITIAL SETUP – run this ONCE to create all sheets
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Counters Sheet ---
  let counters = ss.getSheetByName(CONFIG.SHEETS.COUNTERS);
  if (!counters) counters = ss.insertSheet(CONFIG.SHEETS.COUNTERS);
  counters.clearContents();
  counters.getRange('A1:B1').setValues([['Category', 'LastCount']]);
  counters.getRange('A2:B4').setValues([
    ['Individual', 1000],
    ['Vehicle',    2000],
    ['Pet',        3000]
  ]);
  counters.getRange('A1:B1').setFontWeight('bold').setBackground('#1a2744').setFontColor('#ffffff');

  // --- Individual Registrations ---
  let ind = ss.getSheetByName(CONFIG.SHEETS.INDIVIDUAL);
  if (!ind) ind = ss.insertSheet(CONFIG.SHEETS.INDIVIDUAL);
  ind.clearContents();
  const indHeaders = ['Unique ID','Timestamp','Full Name','CNIC','Phone','Email','Blood Group','Address',
                      'EC1 Name','EC1 Relation','EC1 Phone','EC1 Email',
                      'EC2 Name','EC2 Relation','EC2 Phone','EC2 Email',
                      'QR Code URL','Alert URL','Status'];
  ind.getRange(1, 1, 1, indHeaders.length).setValues([indHeaders]).setFontWeight('bold').setBackground('#c8102e').setFontColor('#ffffff');
  ind.setFrozenRows(1);

  // --- Vehicle Registrations ---
  let veh = ss.getSheetByName(CONFIG.SHEETS.VEHICLE);
  if (!veh) veh = ss.insertSheet(CONFIG.SHEETS.VEHICLE);
  veh.clearContents();
  const vehHeaders = ['Unique ID','Timestamp','Number Plate','Model','Owner Name','Owner CNIC',
                      'Owner Phone','Owner Email','Color','Vehicle Type','Notes','QR Code URL','Alert URL','Status'];
  veh.getRange(1, 1, 1, vehHeaders.length).setValues([vehHeaders]).setFontWeight('bold').setBackground('#1a3a6b').setFontColor('#ffffff');
  veh.setFrozenRows(1);

  // --- Pet Registrations ---
  let pet = ss.getSheetByName(CONFIG.SHEETS.PET);
  if (!pet) pet = ss.insertSheet(CONFIG.SHEETS.PET);
  pet.clearContents();
  const petHeaders = ['Unique ID','Timestamp','Pet Name','Pet Type','Breed','Age','Color/Description',
                      'Owner Name','Owner Phone','Owner Email','Medical Notes','QR Code URL','Alert URL','Status'];
  pet.getRange(1, 1, 1, petHeaders.length).setValues([petHeaders]).setFontWeight('bold').setBackground('#1f6b3a').setFontColor('#ffffff');
  pet.setFrozenRows(1);

  // --- Alert Log ---
  let alerts = ss.getSheetByName(CONFIG.SHEETS.ALERTS);
  if (!alerts) alerts = ss.insertSheet(CONFIG.SHEETS.ALERTS);
  alerts.clearContents();
  const alertHeaders = ['Timestamp','Unique ID','Alert Type','Urgency','Description','Helper Name','Helper Phone','Location','GPS Coords','Submitted At'];
  alerts.getRange(1, 1, 1, alertHeaders.length).setValues([alertHeaders]).setFontWeight('bold').setBackground('#e63946').setFontColor('#ffffff');
  alerts.setFrozenRows(1);

  // --- ID Mapping (Print Sheet) ---
  let idmap = ss.getSheetByName(CONFIG.SHEETS.ID_MAP);
  if (!idmap) idmap = ss.insertSheet(CONFIG.SHEETS.ID_MAP);
  idmap.clearContents();
  const mapHeaders = ['Unique ID','Name','Category','Landing Page URL','QR Code URL','QR Preview','Registered On','Print Status'];
  idmap.getRange(1, 1, 1, mapHeaders.length).setValues([mapHeaders]).setFontWeight('bold').setBackground('#4a6cf7').setFontColor('#ffffff');
  idmap.setFrozenRows(1);
  idmap.setRowHeights(2, 100, 120);
  idmap.setColumnWidth(6, 140);

  SpreadsheetApp.getUi().alert('✅ SafeTag sheets created successfully!\n\nAll 6 sheets are ready:\n• Individual_Registrations\n• Vehicle_Registrations\n• Pet_Registrations\n• Alert_Log\n• ID_Mapping_Print\n• Counters\n\nNow deploy as Web App.');
}
