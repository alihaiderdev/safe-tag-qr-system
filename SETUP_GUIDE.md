# SafeTag QR System – Complete Setup Guide
## ایک مکمل رہنمائی | Step-by-Step Instructions

---

## 📁 Project Files Overview

```
qr-system/
├── registration/
│   └── index.html        ← Form A – Registration Portal
├── landing/
│   └── index.html        ← QR Landing Page (Middle Man)
├── alert/
│   └── index.html        ← Form B – Alert Form for Helpers
├── backend/
│   └── Code.gs           ← Google Apps Script (Full Backend)
└── SETUP_GUIDE.md        ← This file
```

---

## STEP 1 – Google Sheet Setup

1. **Google Sheets kholein** → https://sheets.google.com
2. **New spreadsheet** banayen → Name: "SafeTag Database"
3. URL se **Spreadsheet ID** copy karein:
   - URL: `https://docs.google.com/spreadsheets/d/[THIS_IS_THE_ID]/edit`

---

## STEP 2 – Apps Script Deploy

1. Sheet mein jayen: **Extensions → Apps Script**
2. `Code.gs` file ka pura content paste karein
3. **CONFIG section** update karein:
   ```javascript
   SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),  // auto
   LANDING_PAGE_URL: 'https://your-site.github.io/landing/index.html',
   ALERT_FORM_URL:   'https://your-site.github.io/alert/index.html',
   ```
4. `setupSheets()` function ko **Run** karein (pehli baar only)
   - Permission allow karein jab pooche
   - 6 sheets automatically ban jayengi

5. **Deploy karein:**
   - Click: Deploy → New Deployment
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - **Web App URL copy kar lein** ← yeh important hai!

---

## STEP 3 – HTML Files Update

### registration/index.html
Line dhoondhein:
```javascript
const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const LANDING_PAGE_URL = 'YOUR_LANDING_PAGE_URL_HERE';
```
Replace karein apne URLs se.

### alert/index.html
Line dhoondhein:
```javascript
const APPS_SCRIPT_ALERT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```
Same Apps Script URL paste karein.

### landing/index.html
Line dhoondhein:
```javascript
const ALERT_FORM_URL = 'alert.html';
```
Isko apne full URL se replace karein agar files alag servers par hain.

---

## STEP 4 – Host Your HTML Files (Free Options)

### Option A – GitHub Pages (Recommended, Free)
1. GitHub.com par account banayen (free)
2. New repository banayen → `safetag-system` (public)
3. Teeno HTML files upload karein apne folders mein
4. Settings → Pages → Source: main branch → Save
5. URL milega: `https://yourusername.github.io/safetag-system/`

### Option B – Google Sites (Easiest)
1. sites.google.com kholein
2. New site banayen
3. HTML embed feature use karein for each page

### Option C – Netlify (Also Free)
1. netlify.com → Sign up free
2. Folder drag & drop karein
3. URL milta hai instantly

---

## STEP 5 – QR Sticker Printing

**ID Mapping Sheet** se print karein:
1. Google Sheet mein `ID_Mapping_Print` tab kholein
2. QR Preview column mein QR image nazar aayegi
3. Sheet ko print karein ya screenshot lein
4. Print shop wale ko dein

**QR Code URL format:**
```
https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=[LANDING_URL]?ID=PP-1001
```

For better/custom QR codes: **qr-code-generator.com** use karein

---

## STEP 6 – Email Setup

Gmail automatically work karta hai Apps Script ke sath.
- Registration confirmation email automatically jayegi
- Alert emails automatically jayengi

**Optional – WhatsApp/SMS:**
Twilio account banayen (free trial available):
- twilio.com par sign up karein
- Account SID aur Auth Token lein
- CONFIG mein paste karein
- `SEND_SMS_ALERTS: true` karein

---

## 🔒 Security Notes

| Feature | Status |
|---------|--------|
| Registration data public nahi hai | ✅ Only in Google Sheet |
| Helper ko data nahi dikhta | ✅ Sirf alert bhej sakta hai |
| QR scan karne par private info nahi | ✅ Sirf 2 buttons dikhte hain |
| Email alerts encrypted | ✅ Gmail ke through |

---

## 📊 Google Sheets Structure

| Sheet Name | Purpose |
|-----------|---------|
| `Individual_Registrations` | Sab individual records |
| `Vehicle_Registrations` | Sab vehicle records |
| `Pet_Registrations` | Sab pet records |
| `Alert_Log` | Har ek alert ka record |
| `ID_Mapping_Print` | Printing ke liye ID + QR list |
| `Counters` | Auto ID generation counters |

---

## 🆔 ID Format

| Category | Prefix | Example |
|----------|--------|---------|
| Individual | PP | PP-1001 |
| Vehicle | VH | VH-2001 |
| Pet | PT | PT-3001 |

---

## ❓ Troubleshooting

**Q: CORS error aa raha hai?**
A: Apps Script deployment mein "Anyone" access set karein. Re-deploy karein.

**Q: Email nahi ja rahi?**
A: Gmail mein Apps Script permissions check karein.

**Q: QR Code kaam nahi kar raha?**
A: Landing page URL correct hai? URL mein spaces nahi hone chahiye.

**Q: Sheet mein data nahi aa raha?**
A: `setupSheets()` dobara run karein. Permission check karein.

---

## 📞 System Flow Summary

```
1. Owner registers on Form A
   → Unique ID generate hota hai (PP-1001)
   → Data Google Sheet mein save hota hai
   → QR Code generate hota hai
   → Confirmation email jata hai

2. QR Sticker print ho kar ID/vehicle/pet par lag jata hai

3. Stranger QR scan karta hai
   → Landing Page khulta hai
   → EMERGENCY ya PARKING button choose karta hai
   → Alert Form (Form B) khulta hai
   → Alert submit karta hai

4. Alert submit hone par
   → Alert Sheet mein log hota hai
   → Owner ka email/number Sheet se nikalti hai
   → Urgent email jata hai owner ko
   → Emergency hone par Emergency Contacts ko bhi email jata hai
```

---

*SafeTag – Emergency Response System | Built for Pakistan*
