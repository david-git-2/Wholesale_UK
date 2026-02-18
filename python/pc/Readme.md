Here is your **short, clean step-by-step guide** in Markdown format 👇

You can paste this into your project `README.md`.

---

# 📦 Google Drive OAuth Setup Guide (Personal Gmail)

This guide explains how to configure Google Cloud so the Python script can upload images to your Google Drive folder.

---

## 1️⃣ Create a Google Cloud Project

1. Go to: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Click **Select Project**
3. Click **New Project**
4. Name it (example: `brandwala`)
5. Click **Create**

---

## 2️⃣ Enable Google Drive API

1. Go to: **APIs & Services → Library**
2. Search for **Google Drive API**
3. Click it
4. Click **Enable**

---

## 3️⃣ Configure OAuth Consent Screen

1. Go to **Google Auth Platform → OAuth consent screen**
2. Select **External**
3. Fill required fields:

   * App name
   * User support email
   * Developer email
4. Save & Continue through all steps
5. Keep app in **Testing** mode

### Add yourself as Test User

1. Scroll to **Audience / Test Users**
2. Click **Add Users**
3. Add your Gmail address
4. Save

---

## 4️⃣ Create OAuth Client (Desktop App)

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials**
3. Choose **OAuth Client ID**
4. Application type → **Desktop app**
5. Click **Create**
6. Click **Download JSON**

---

## 5️⃣ Place OAuth JSON in Project

Move the downloaded file to:

```
pc/credentials/oauth_client.json
```

Rename it exactly to:

```
oauth_client.json
```

---

## 6️⃣ First Script Run (Authentication)

Run:

```bash
python3 pc/export_pc_data.py
```

* Browser opens
* Login with your Gmail
* Click **Allow**
* Token is saved as:

```
pc/credentials/token.json
```

After this, future runs will not require login.

---

## 7️⃣ Set Drive Folder for Uploads

If you want images uploaded to a specific folder:

1. Open the folder in Drive
2. Copy folder ID from URL:

```
https://drive.google.com/drive/folders/FOLDER_ID
```

3. Set in script:

```python
DRIVE_FOLDER_ID = "FOLDER_ID"
```

---

## ✅ Result

When you run the script:

* Images are extracted from Excel
* Uploaded to your Drive folder
* Public URLs generated
* `docs/pc_data.json` is created

---

## 🔒 Important

Add to `.gitignore`:

```
pc/credentials/
```

Never commit OAuth credentials or token files.

---

If you'd like, I can also generate a **production-ready README section** explaining how your entire Excel → Drive → JSON pipeline works.
