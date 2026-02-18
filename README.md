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
- Saves results to `web/kbeauty/data/koba_data.json`
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
pip install -r scraper/requirements.txt
```

---

## 🔐 Step 6: Configure environment variables (.env)

This project uses a **`.env` file** for credentials and settings.

### 1️⃣ Create your `.env` file

Copy the example file:

```bash
cp .example.env .env
```

### 2️⃣ Edit `.env`

Open `.env` in any text editor and fill in your details:

```env
KOBA_EMAIL=your_email
KOBA_PASSWORD=your_password
KOBA_PRODUCT_FILTER=cosrx
```

### 🔁 Change product filter anytime

To scrape different products, just update:

```env
KOBA_PRODUCT_FILTER=your_new_filter
```

No code changes needed.

---

## 🛠 Step 7: Use Make Commands (Recommended)

This project uses a **Makefile**, so you don’t need to remember long commands.

### Available commands

| Command                        | What it does                             |
| ------------------------------ | ---------------------------------------- |
| `make scrape`                  | Scrape product data                      |
| `make business`                | Scrape + export Excel **with images**    |
| `make business_without_images` | Scrape + export Excel **without images** |
| `make customer`                | Scrape + export customer Excel           |

---

### ▶️ Most common usage

#### Scrape only

```bash
make scrape
```

#### Scrape + export Excel (with images)

```bash
make business
```

#### Scrape + export Excel (no images – faster)

```bash
make business_without_images
```

---

## 📁 Output files

| File                             | Description                |
| -------------------------------- | -------------------------- |
| `web/kbeauty/data/koba_data.json`                 | Scraped product data       |
| `docs/products_with_images.xlsx` | Excel with embedded images |
| `docs/products.xlsx`             | Excel without images       |

---

## 🚀 Step 8: Update the live website (Git only)

```bash
git add web/kbeauty/data/koba_data.json
git commit -m "Update product data"
git push
```

The website updates automatically:

🌐 [https://david-test-007.github.io/koba-scraper/](https://david-test-007.github.io/koba-scraper/)

---

## 🧠 Notes for non-technical users

* You only need to do **Steps 1–6 once**
* Next time, just:

  ```bash
  cd koba-scraper
  source .venv/bin/activate   # Windows: .venv\Scripts\activate
  make business
  ```
* To change what products are scraped, just edit `.env`

---

## 🆘 Troubleshooting

### `make: command not found`

* **Windows**: Install **Git Bash** and run commands there
* **macOS**: Run:

  ```bash
  xcode-select --install
  ```

### Excel images missing?

* Ensure Python version is **3.13**
* Do NOT use Python 3.14

---

✅ That’s it.
This setup is **safe, repeatable, and beginner-friendly**.

```

---

If you want next upgrades (optional but powerful):
- auto-create `.env` on first run
- `make setup` (one command setup)
- `.env` validation with friendly errors
- double-click launcher for non-tech users

Just say the word — this README is already very solid 👌
```


https://script.google.com/home/projects/1f0QIHY2zpqn1DiRIWfLjO-7o9eVz8OoFBM5hSmX9B5tbzviHxs3yDIai/edit