Perfect — here is your **updated full README**, with only the **requested changes** applied:

* ✅ **Git install marked as OPTIONAL**
* ✅ **`.env` file introduced (with `.example.env`)**
* ✅ Clear instruction to **change product filter via `.env`**
* ✅ Everything else kept the same (no overengineering)

You can **replace your README.md entirely** with this.

---

```markdown
# Koba Scraper

This project:

- Logs into **kobareseller.com**
- Scrapes product data using a search filter (example: `cosrx`)
- Collects **all pages**
- Saves results to `docs/kbeauty/data/koba_data.json`
- Displays products on a live website
- Can export products to **Excel (with or without embedded images)**

🌐 **Live site:**  
https://david-test-007.github.io/koba-scraper/

---

## ⚠️ Important Python Version Notice

- ✅ **Python 3.13 is REQUIRED**
- ❌ Python 3.14 is **NOT supported yet**
- Excel image export depends on `Pillow`, which works reliably on **Python 3.13**

---

## 🧑‍💻 Step 1: Install Python (GUI – Any OS)

### Windows / macOS / Linux (Easy way)

1. Go to 👉 https://www.python.org/downloads/
2. Download **Python 3.13.x**
3. Run the installer

### ⚠️ IMPORTANT (Windows only)
During install, **check this box**:
```

☑ Add Python to PATH

````

### Verify installation
Open Terminal / Command Prompt and run:
```bash
python --version
````

or

```bash
python3 --version
```

You should see:

```
Python 3.13.x
```

---

## 🧑‍💻 Step 2: Install Git (OPTIONAL)

Git is **recommended but not required**.

You need Git only if you want to:

* Easily update the project later
* Push updates to the live website

### Install Git (optional)

1. Go to 👉 [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Install Git using default options

Verify (optional):

```bash
git --version
```

👉 **If you don’t want Git**, you can download the project as a ZIP from GitHub instead.

---

## 📦 Step 3: Get the project

### Option A: Using Git (recommended)

```bash
git clone https://github.com/david-test-007/koba-scraper.git
cd koba-scraper
```

### Option B: Without Git (ZIP download)

1. Open 👉 [https://github.com/david-test-007/koba-scraper](https://github.com/david-test-007/koba-scraper)
2. Click **Code → Download ZIP**
3. Unzip the file
4. Open the folder in your terminal

---

## 🧪 Step 4: Create & activate virtual environment

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

You should now see:

```
(.venv)
```

---
 note local run 
 python3 -m http.server 8000
## 📥 Step 5: Install dependencies

```bash
pip install -r requirements.txt
```

---

place the data excel in the data 