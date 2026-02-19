scrape:
	python python/scraper/scrape.py

business: scrape
	python python/scraper/export_to_excel_with_images.py

business_without_images: scrape
	python python/scraper/export_excel.py

pc:
	python python/pc/export_pc_data.py