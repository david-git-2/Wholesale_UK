scrape:
	python scraper/scrape.py

business: scrape
	python scraper/export_to_excel_with_images.py

business_without_images: scrape
	python scraper/export_excel.py

customer: scrape
	python scraper/export_to_excel_customer.py
