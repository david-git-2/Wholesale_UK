koba-scraper/
├── README.md
├── Makefile
├── .gitignore
├── .env.example
├── notes/
│   └── plan.txt

├── docs/
│   ├── index.html                    # landing page (choose kbeauty / uk)

│   ├── shared/                       # shared web assets
│   │   ├── auth.js                   # ✅ shared login
│   │   └── shared.css                # optional shared styles

│   ├── kbeauty/
│   │   ├── index.html
│   │   ├── orders.html
│   │   ├── config.js
│   │   ├── data/
│   │   │   ├── data.json
│   │   │   ├── brands.json
│   │   │   └── pc_data.json          # optional
│   │   └── assets/                   # ✅ kbeauty-only assets
│   │       ├── api.js
│   │       ├── app.css
│   │       ├── app.js
│   │       ├── cart.config.js
│   │       ├── cart.core.js
│   │       ├── cart.math.js
│   │       ├── cart.stock.js
│   │       ├── cart.ui.js
│   │       ├── orders.core.js
│   │       ├── orders.page.css
│   │       ├── orders.page.js
│   │       └── orders.ui.js
│   │
│   ├── uk/
│   │   ├── index.html
│   │   ├── orders.html
│   │   ├── config.js
│   │   ├── data/
│   │   │   ├── data.json
│   │   │   ├── brands.json
│   │   │   └── pc_data.json          # optional
│   │   └── assets/                   # ✅ uk-only assets
│   │       ├── api.js
│   │       ├── app.css
│   │       ├── app.js
│   │       ├── cart.config.js
│   │       ├── cart.core.js
│   │       ├── cart.math.js
│   │       ├── cart.stock.js
│   │       ├── cart.ui.js
│   │       ├── cart.math.js
│   │       ├── cart.stock.js
│   │       ├── orders.core.js
│   │       ├── orders.page.css
│   │       ├── orders.page.js
│   │       └── orders.ui.js

├── apps_script/
│   ├── Auth.gs
│   ├── Main.gs
│   ├── Orders_Create.gs
│   ├── Orders_Delete.gs
│   ├── Orders_List.gs
│   ├── Orders_Update.gs
│   ├── Utils.gs
│   └── README.md

├── python/
│   ├── requirements.txt
│   ├── scraper/
│   │   ├── scrape.py
│   │   ├── export_excel.py
│   │   ├── export_to_excel_customer.py
│   │   └── export_to_excel_with_images.py
│   └── pc/
│       ├── export_pc_data.py
│       └── data/
│           └── pc_data.xlsx

├── outputs/                          # generated files
│   ├── business/
│   ├── business_images/
│   └── customer/

└── secrets/                          # NEVER COMMIT
    ├── oauth_client.json
    └── token.json
