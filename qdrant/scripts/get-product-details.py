"""
Scrapes IKEA product details from all subcategories.
Handles pagination, extracts comprehensive product data, and uses multithreading for performance.
"""

import json
import time
import logging
import re
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse, parse_qs

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException
from webdriver_manager.chrome import ChromeDriverManager
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_driver() -> webdriver.Chrome:
    """Creates and configures Chrome WebDriver for scraping."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--allow-running-insecure-content")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-plugins")
    chrome_options.add_argument("--disable-images")
    chrome_options.add_argument("--log-level=3")
    chrome_options.add_argument("--silent")
    chrome_options.add_argument("--disable-logging")
    chrome_options.add_argument("--disable-background-timer-throttling")
    chrome_options.add_argument("--disable-backgrounding-occluded-windows")
    chrome_options.add_argument("--disable-renderer-backgrounding")
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def extract_rating_info(product_element) -> Dict[str, Any]:
    """Extract rating information from product element."""
    rating_info = {
        "rating": None,
        "review_count": None,
        "rating_percentage": None
    }
    
    try:
        rating_button = product_element.find_element(By.CSS_SELECTOR, '.plp-rating')
        
        
        rating_stars = rating_button.find_element(By.CSS_SELECTOR, '.plp-rating__stars')
        style = rating_stars.get_attribute('style')
        if style and '--rating:' in style:
            rating_match = re.search(r'--rating:\s*(\d+)%', style)
            if rating_match:
                rating_percentage = int(rating_match.group(1))
                rating_info["rating_percentage"] = rating_percentage
                rating_info["rating"] = round((rating_percentage / 100) * 5, 1)
        
        
        review_count_elem = rating_button.find_element(By.CSS_SELECTOR, '.plp-price-module__rating-label-count')
        review_text = review_count_elem.text.strip('()')
        if review_text.isdigit():
            rating_info["review_count"] = int(review_text)
            
    except NoSuchElementException:
        pass
    
    return rating_info

def extract_product_variants(product_element) -> List[Dict[str, Any]]:
    """Extract product variants information."""
    variants = []
    
    try:
        variant_fieldset = product_element.find_element(By.CSS_SELECTOR, '.plp-product-variants')
        variant_labels = variant_fieldset.find_elements(By.CSS_SELECTOR, '.plp-product-variant')
        
        for variant_label in variant_labels:
            try:
                variant_link = variant_label.find_element(By.CSS_SELECTOR, '.plp-product-variant__link')
                variant_img = variant_label.find_element(By.CSS_SELECTOR, '.plp-product-variant__img')
                variant_text = variant_label.find_element(By.CSS_SELECTOR, '.sr-only')
                
                
                is_selected = 'plp-product-variant__img--selected' in variant_img.get_attribute('class')
                
                variant_info = {
                    "url": variant_link.get_attribute('href'),
                    "image_url": variant_img.get_attribute('src'),
                    "description": variant_text.text.strip(),
                    "is_selected": is_selected
                }
                
                
                variant_url = variant_info["url"]
                if variant_url:
                    url_parts = variant_url.rstrip('/').split('/')
                    if url_parts:
                        variant_info["product_id"] = url_parts[-1]
                
                variants.append(variant_info)
                
            except NoSuchElementException:
                continue
                
    except NoSuchElementException:
        pass
    
    return variants

def extract_product_data(product_element) -> Dict[str, Any]:
    """Extract comprehensive product data from a product element."""
    try:
        
        product_data = {
            "product_id": product_element.get_attribute("data-ref-id"),
            "product_number": product_element.get_attribute("data-product-number"),
            "price": product_element.get_attribute("data-price"),
            "currency": product_element.get_attribute("data-currency"),
            "product_name": product_element.get_attribute("data-product-name"),
        }
        
        
        if product_data["price"]:
            try:
                product_data["price"] = float(product_data["price"])
            except ValueError:
                pass
        
        
        try:
            product_link = product_element.find_element(By.CSS_SELECTOR, '.plp-product__image-link')
            product_data["url"] = product_link.get_attribute("href")
        except NoSuchElementException:
            product_data["url"] = None
        
        
        try:
            main_img = product_element.find_element(By.CSS_SELECTOR, '.plp-product__image')
            product_data["main_image_url"] = main_img.get_attribute("src")
            product_data["main_image_alt"] = main_img.get_attribute("alt")
        except NoSuchElementException:
            product_data["main_image_url"] = None
            product_data["main_image_alt"] = None
        
        
        try:
            alt_img = product_element.find_element(By.CSS_SELECTOR, '.plp-product__image--alt')
            product_data["alt_image_url"] = alt_img.get_attribute("src")
        except NoSuchElementException:
            product_data["alt_image_url"] = None
        
        
        try:
            description_elem = product_element.find_element(By.CSS_SELECTOR, '.plp-price-module__description')
            product_data["description"] = description_elem.text.strip()
        except NoSuchElementException:
            product_data["description"] = None
        
                
        product_data["rating_info"] = extract_rating_info(product_element)
        
        product_data["variants"] = extract_product_variants(product_element)
        
        quick_facts = []
        try:
            quick_facts_container = product_element.find_element(By.CSS_SELECTOR, '.plp-quick-facts')
            fact_elements = quick_facts_container.find_elements(By.CSS_SELECTOR, '.plp-text')
            for fact_elem in fact_elements:
                fact_text = fact_elem.text.strip()
                if fact_text:
                    quick_facts.append(fact_text)
        except NoSuchElementException:
            pass
        
        product_data["quick_facts"] = quick_facts
        
        return product_data
        
    except Exception as e:
        logger.warning(f"Error extracting product data: {e}")
        return None

def get_progress_info(driver: webdriver.Chrome) -> tuple:
    """Get current progress information from the page."""
    try:
        progress_element = driver.find_element(By.CSS_SELECTOR, '.plp-product-list__progress')
        current = int(progress_element.get_attribute('value'))
        total = int(progress_element.get_attribute('max'))
        return current, total
    except (NoSuchElementException, ValueError, TypeError):
        return None, None

def load_all_products(driver: webdriver.Chrome, url: str) -> List[Dict[str, Any]]:
    """Load all products from a subcategory by handling pagination."""
    logger.info(f"Loading products from: {url}")
    driver.get(url)
    time.sleep(3)
    
    products = []
    
    current, total = get_progress_info(driver)
    if total is None:
        logger.warning(f"Could not find progress indicator for {url}")
        total = 0
    
    progress_bar = tqdm(total=total, desc=f"Loading products", unit="products")
    
    while True:
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '.plp-product-list__products'))
            )
            
            product_elements = driver.find_elements(By.CSS_SELECTOR, '.plp-mastercard[data-testid="plp-product-card"]')
            
            current_product_ids = {p.get("product_id") for p in products if p and p.get("product_id")}
            
            new_products = 0
            for element in product_elements:
                product_data = extract_product_data(element)
                if product_data and product_data.get("product_id") not in current_product_ids:
                    products.append(product_data)
                    current_product_ids.add(product_data.get("product_id"))
                    new_products += 1
            
            current, total = get_progress_info(driver)
            if current is not None and total is not None:
                progress_bar.total = total
                progress_bar.n = current
                progress_bar.refresh()
            else:
                progress_bar.update(new_products)
            
            if current is not None and total is not None and current >= total:
                break
            
            try:
                show_more_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, 'a[aria-label="Show more products"]'))
                )
                
                old_count = len(product_elements)
                
                driver.execute_script("arguments[0].scrollIntoView(true);", show_more_button)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", show_more_button)

                for _ in range(10):  
                    time.sleep(1)
                    new_elements = driver.find_elements(By.CSS_SELECTOR, '.plp-mastercard[data-testid="plp-product-card"]')
                    if len(new_elements) > old_count:
                        logger.info(f"New products loaded: {len(new_elements)} (was {old_count})")
                        break
                else:
                    logger.warning("No new products loaded after clicking 'Show more'")
                    break
                
            except (TimeoutException, NoSuchElementException, ElementClickInterceptedException):
                logger.info("No more products to load or button not clickable")
                break
                
        except TimeoutException:
            logger.warning(f"Timeout waiting for products to load from {url}")
            break
        except Exception as e:
            logger.error(f"Error loading products from {url}: {e}")
            break
    
    progress_bar.close()
    logger.info(f"Loaded {len(products)} products from {url}")
    return products

def process_subcategory(subcategory: Dict[str, Any], category_name: str) -> Dict[str, Any]:
    """Process a single subcategory and extract all products."""
    driver = None
    try:
        driver = setup_driver()
        
        subcategory_name = subcategory.get("name", "Unknown")
        subcategory_url = subcategory.get("url")
        
        if not subcategory_url:
            logger.warning(f"No URL found for subcategory: {subcategory_name}")
            return None
        
        logger.info(f"Processing subcategory: {category_name} -> {subcategory_name}")
        
        products = load_all_products(driver, subcategory_url)
        
        return {
            "category_name": category_name,
            "subcategory_name": subcategory_name,
            "subcategory_url": subcategory_url,
            "tracking_label": subcategory.get("tracking_label"),
            "product_count": len(products),
            "products": products
        }
        
    except Exception as e:
        logger.error(f"Error processing subcategory {subcategory.get('name', 'Unknown')}: {e}")
        return None
    finally:
        if driver:
            driver.quit()

def main():
    """Main function to scrape all IKEA product details."""
    logger.info("Starting IKEA product details scraper...")
    
    
    try:
        with open("ikea_product_categories.json", "r", encoding="utf-8") as f:
            categories = json.load(f)
    except FileNotFoundError:
        logger.error("ikea_product_categories.json not found. Please run get-categories.py first.")
        return
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing categories JSON: {e}")
        return
    
    logger.info(f"Loaded {len(categories)} categories")
    
    
    total_subcategories = sum(len(cat.get("subcategories", [])) for cat in categories)
    logger.info(f"Total subcategories to process: {total_subcategories}")
    
    
    all_results = []
    
    
    subcategory_tasks = []
    for category in categories:
        category_name = category.get("category_name")
        for subcategory in category.get("subcategories", []):
            subcategory_tasks.append((subcategory, category_name))
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_subcategory = {
            executor.submit(process_subcategory, subcategory, category_name): (subcategory, category_name)
            for subcategory, category_name in subcategory_tasks
        }
        

        with tqdm(total=len(future_to_subcategory), desc="Processing subcategories", unit="subcategory") as pbar:
            for future in as_completed(future_to_subcategory):
                subcategory, category_name = future_to_subcategory[future]
                try:
                    result = future.result()
                    if result:
                        all_results.append(result)
                        logger.info(f"Completed: {category_name} -> {subcategory.get('name')} ({result['product_count']} products)")
                    else:
                        logger.warning(f"No result for: {category_name} -> {subcategory.get('name')}")
                except Exception as e:
                    logger.error(f"Error processing {category_name} -> {subcategory.get('name')}: {e}")
                
                pbar.update(1)
    

    total_products = sum(result["product_count"] for result in all_results)
    

    output_data = {
        "scrape_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_categories": len(categories),
        "total_subcategories": len(all_results),
        "total_products": total_products,
        "results": all_results
    }
    
    output_file = "ikea_products.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Successfully scraped {total_products} products from {len(all_results)} subcategories")
    logger.info(f"Results saved to {output_file}")
    

    print(f"\n=== SCRAPING SUMMARY ===")
    print(f"Categories processed: {len(categories)}")
    print(f"Subcategories processed: {len(all_results)}")
    print(f"Total products scraped: {total_products}")
    print(f"Output file: {output_file}")
    

    category_counts = {}
    for result in all_results:
        cat_name = result["category_name"]
        category_counts[cat_name] = category_counts.get(cat_name, 0) + result["product_count"]
    
    print(f"\n=== TOP CATEGORIES BY PRODUCT COUNT ===")
    for cat_name, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"{cat_name}: {count} products")

if __name__ == "__main__":
    main()
