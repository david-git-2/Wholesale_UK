Good addition 👍 — that makes it much cleaner operationally.

Below is the **fully updated and finalized document** including the new **Order Name** field, integrated properly into the system.

---

# 📦 UK ORDERING SYSTEM — COMPLETE SPECIFICATION (UPDATED)

---

# 1️⃣ PRODUCT SOURCE

* Product master stored as **JSON inside Apps Script**
* Not in Google Sheets
* Lookup key: **Barcode (Primary Key)**

Used fields:

* BARCODE
* BRAND
* DESCRIPTION
* PIECE PRICE £
* INNER CASE
* IMAGE URL

---

# 2️⃣ ORDER LIFECYCLE (REFINED STATUS MODEL)

---

## 🔵 STATUS FLOW

### 1. `draft`

* Order created but not submitted
* Customer can:

  * Add items
  * Update quantities
  * Delete items
* Fully editable

---

### 2. `submitted`

(Customer confirms order)

* Quantities locked
* Customer cannot modify items
* Admin begins pricing

---

### 3. `priced`

(Admin completes pricing)

Admin sets:

* ConversionRate
* CuriaCost
* ProductWeight
* PackageWeight

System calculates:

* UnitCost
* OfferedPrice
* Totals

Customer can:

* Accept
* Counter-offer

---

### 4. `under_review`

(Customer counter-offers)

* Customer updates CustomerPriceBDT
* Admin reviews

---

### 5. `finalized`

(Admin sets final pricing)

* Admin sets FinalPriceBDT
* Pricing locked
* Ready for shipment

---

### 6. `processing`

(Admin preparing shipment)

* Admin updates ShippedQuantity

---

### 7. `partially_delivered`

---

### 8. `delivered`

---

### 9. `cancelled`

---

# 3️⃣ ORDER PERMISSIONS MATRIX

| Status              | Customer          | Admin              |
| ------------------- | ----------------- | ------------------ |
| draft               | Full edit         | Full edit          |
| submitted           | Read only         | Full edit          |
| priced              | Accept or counter | Full edit          |
| under_review        | Adjust counter    | Full edit          |
| finalized           | Read only         | Full edit          |
| processing          | Read only         | Update shipped qty |
| partially_delivered | Read only         | Full edit          |
| delivered           | Read only         | Read only          |
| cancelled           | Read only         | Full edit          |

---

# 4️⃣ PRICING FORMULA

### Order-Level Inputs

* ConversionRate (GBP → BDT)
* CuriaCost (GBP per KG)

---

### Unit Cost (GBP)

```
unitCostGBP =
((packageWeight + productWeight) / 1000) * curiaCost
+ piecePriceGBP
```

---

### Unit Cost (BDT)

```
unitCostBDT = unitCostGBP * conversionRate
```

---

### Offered Price

```
offeredPriceBDT = unitCostBDT * 1.10
```

(10% margin)

---

### Editable Pricing Fields

| Field            | Controlled By |
| ---------------- | ------------- |
| OfferedPriceBDT  | System        |
| CustomerPriceBDT | Customer      |
| FinalPriceBDT    | Admin         |

---

# 5️⃣ ORDER TOTALS

Order table now includes:

### Cost Totals

* TotalCostGBP
* TotalCostBDT

### Pricing Totals

* TotalOfferedBDT
* TotalCustomerBDT
* TotalFinalBDT

All totals are automatically calculated from line items.

---

# 6️⃣ UPDATED DATABASE DESIGN

---

# 📄 TABLE 1 — `UK_Orders`

| Column           | Type   | Description                                              |
| ---------------- | ------ | -------------------------------------------------------- |
| OrderSL          | Number | Auto increment                                           |
| OrderId          | String | Unique ID                                                |
| OrderName        | String | **User-defined order name (e.g., “Ramadan Shipment 1”)** |
| CreatorEmail     | String |                                                          |
| CreatorRole      | String |                                                          |
| Status           | String | See lifecycle                                            |
| ConversionRate   | Number | Per order                                                |
| CuriaCost        | Number | Per order                                                |
| StockListId      | String | Admin grouping ID                                        |
| TotalCostGBP     | Number | System                                                   |
| TotalCostBDT     | Number | System                                                   |
| TotalOfferedBDT  | Number | System                                                   |
| TotalCustomerBDT | Number | System                                                   |
| TotalFinalBDT    | Number | System                                                   |
| CreatedAt        | ISO    |                                                          |
| UpdatedAt        | ISO    |                                                          |

---

## 🔹 Order Name Rules

* Required field during creation
* Editable:

  * Customer while `draft`
  * Admin anytime
* Used for:

  * Display
  * Filtering
  * Reporting
  * Stock grouping reference

---

# 📄 TABLE 2 — `UK_OrderItems`

| Column               | Type   | Description       |
| -------------------- | ------ | ----------------- |
| ItemSL               | Number | Auto increment    |
| OrderId              | String | FK                |
| Barcode              | String | Primary per order |
| Brand                | String | From JSON         |
| Description          | String | From JSON         |
| ImageUrl             | String | From JSON         |
| PiecePriceGBP        | Number | From JSON         |
| InnerCase            | Number | From JSON         |
| OrderedQuantity      | Number | Customer input    |
| ShippedQuantity      | Number | Admin input       |
| ProductWeight        | Number | grams             |
| PackageWeight        | Number | grams             |
| UnitCostGBP          | Number | System            |
| UnitCostBDT          | Number | System            |
| OfferedPriceBDT      | Number | System            |
| CustomerPriceBDT     | Number | Customer input    |
| FinalPriceBDT        | Number | Admin input       |
| CostLineTotalGBP     | Number | System            |
| CostLineTotalBDT     | Number | System            |
| OfferedLineTotalBDT  | Number | System            |
| CustomerLineTotalBDT | Number | System            |
| FinalLineTotalBDT    | Number | System            |
| CreatedAt            | ISO    |                   |
| UpdatedAt            | ISO    |                   |

---

# 7️⃣ STOCK LIST GROUPING

Admin can:

* Assign `StockListId` to orders
* Fetch all items under same StockListId
* System groups by:

  * Barcode
* Returns:

  * Combined OrderedQuantity
  * Combined ShippedQuantity
  * Product details

Used for:

* Packing
* Bulk procurement
* Shipment batching

---

# 8️⃣ FINAL FLOW SUMMARY

1. Customer creates order (with OrderName) → `draft`
2. Customer submits → `submitted`
3. Admin adds pricing data → `priced`
4. Customer:

   * Accepts → `finalized`
   * Counter-offers → `under_review`
5. Admin sets final price → `finalized`
6. Admin processes shipment → `processing`
7. Delivered → `delivered`

---

The system is now:

* Structurally complete
* Negotiation-ready
* Financially consistent
* Shipment-ready
* Aggregation-ready
* Business-grade clean

---

If you approve this final structure, next step will be:

→ Generate the full UK-prefixed Apps Script implementation file exactly matching this specification.
