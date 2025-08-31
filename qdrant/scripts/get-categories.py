"""
Scrapes IKEA product categories by interacting with dropdown menus.
Extracts category names, subcategories, and URLs for furniture items only.
"""

import json
import time
import logging
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SKIP_CATEGORIES = {
    "IKEA Food & Swedish restaurant",
    "Pet accessories",
    "Laundry & cleaning",
    "Home electronics",
    "Smart home",
    "Home improvement"
}

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
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def test_page_access() -> bool:
    """Tests basic page access and saves debug information."""
    driver = None
    try:
        logger.info("Testing page access...")
        driver = setup_driver()
        driver.get("https://www.ikea.com/us/en")
        time.sleep(5)
        
        logger.info(f"Page title: {driver.title}")
        logger.info(f"Current URL: {driver.current_url}")
        
        with open("debug_page_source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        logger.info("Page source saved to debug_page_source.html")
        
        body = driver.find_element(By.TAG_NAME, "body")
        nav_elements = driver.find_elements(By.CSS_SELECTOR, "[class*='navigation']")
        carousel_elements = driver.find_elements(By.CSS_SELECTOR, "[class*='carousel']")
        tabs_elements = driver.find_elements(By.CSS_SELECTOR, "[class*='tabs']")
        
        logger.info(f"Found {len(nav_elements)} navigation, {len(carousel_elements)} carousel, {len(tabs_elements)} tabs elements")
        return True
        
    except Exception as e:
        logger.error(f"Page access test failed: {e}")
        return False
    finally:
        if driver:
            driver.quit()

def extract_subcategories(driver: webdriver.Chrome, category_element, category_name: str) -> Dict[str, Any]:
    """Extracts subcategories for a specific category by clicking and parsing dropdown."""
    try:
        if category_name in SKIP_CATEGORIES:
            logger.info(f"Skipping non-furniture category: {category_name}")
            return None
            
        logger.info(f"Processing category: {category_name}")
        
        driver.execute_script("arguments[0].scrollIntoView(true);", category_element)
        time.sleep(0.5)
        
        category_element.click()
        time.sleep(2)  
        
        try:
            dropdown = WebDriverWait(driver, 10).until(  
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[tabindex="0"][role="listbox"]'))
            )
        except TimeoutException:
            logger.warning(f"Dropdown not found for category: {category_name}")
            return None

        time.sleep(1)
        
        subcategories = []
        explore_link = ""
        
        try:
            explore_elem = dropdown.find_element(By.CSS_SELECTOR, 'ul.hnf-dropdown__explore-category a')
            explore_link = explore_elem.get_attribute("href")
            subcategories.append({
                "name": explore_elem.text.strip(),
                "url": explore_link,
                "tracking_label": explore_elem.get_attribute("data-tracking-label")
            })
        except NoSuchElementException:
            pass
        
        subcategory_links = []
        
        try:
            subcategory_links = dropdown.find_elements(By.CSS_SELECTOR, 'ul.hnf-dropdown__column a')
            logger.info(f"Found {len(subcategory_links)} subcategories using hnf-dropdown__column selector")
        except NoSuchElementException:
            pass
        
        if not subcategory_links:
            try:
                subcategory_links = dropdown.find_elements(By.CSS_SELECTOR, 'a[href*="/cat/"]')
                logger.info(f"Found {len(subcategory_links)} subcategories using alternative selector")
            except NoSuchElementException:
                pass
        
        if not subcategory_links:
            try:
                subcategory_links = dropdown.find_elements(By.CSS_SELECTOR, 'a')
                logger.info(f"Found {len(subcategory_links)} total links in dropdown")
            except NoSuchElementException:
                pass
        
        for link in subcategory_links:
            try:
                href = link.get_attribute("href")
                text = link.text.strip()
                
                if not href or not text:
                    continue
                    
                if href == explore_link:
                    continue
                    
                if "/cat/" not in href:
                    continue
                
                subcategories.append({
                    "name": text,
                    "url": href,
                    "tracking_label": link.get_attribute("data-tracking-label") or ""
                })
            except Exception as e:
                logger.warning(f"Error processing subcategory link: {e}")
        
        logger.info(f"Total subcategories found for {category_name}: {len(subcategories)}")
        
        try:
            driver.find_element(By.TAG_NAME, "body").click()
            time.sleep(0.5)
        except:
            pass
        
        return {
            "category_name": category_name,
            "subcategories": subcategories,
            "explore_link": explore_link
        }
        
    except Exception as e:
        logger.error(f"Error processing category {category_name}: {e}")
        return None

def find_product_navigation(driver: webdriver.Chrome):
    """Finds the product navigation element using multiple strategies."""
    try:
        return WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "hnf-carousel__tabs-navigation-products"))
        )
    except TimeoutException:
        try:
            return WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div.hnf-carousel__tabs-navigation-products'))
            )
        except TimeoutException:
            try:
                return driver.find_element(By.CSS_SELECTOR, '[class*="hnf-carousel__tabs-navigation-products"]')
            except NoSuchElementException:
                logger.error("Could not find product navigation element")
                return None

def get_categories() -> List[Dict[str, Any]]:
    """Main function to scrape all IKEA product categories."""
    url = "https://www.ikea.com/us/en"
    driver = None
    
    try:
        logger.info(f"Fetching {url}...")
        driver = setup_driver()
        driver.get(url)
        time.sleep(10)
        
        product_nav = find_product_navigation(driver)
        if not product_nav:
            return []
        
        category_elements = product_nav.find_elements(By.CSS_SELECTOR, 'div.hnf-carousel-slide a')
        logger.info(f"Found {len(category_elements)} category elements")
        
        if len(category_elements) <= 2:
            logger.warning("Not enough category elements found")
            return []
        
        categories_to_process = []
        for element in category_elements[2:]:
            try:
                category_name = element.text.strip()
                category_url = element.get_attribute("href")
                if category_name and category_name not in SKIP_CATEGORIES:
                    categories_to_process.append((category_name, category_url))
            except Exception as e:
                logger.warning(f"Error processing element: {e}")
                continue
        
        logger.info(f"Processing {len(categories_to_process)} furniture categories")
        
        results = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_category = {
                executor.submit(process_single_category, url, category_name, category_url): category_name
                for category_name, category_url in categories_to_process
            }
            
            for future in as_completed(future_to_category):
                category_name = future_to_category[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        logger.info(f"Completed: {result['category_name']}")
                    else:
                        logger.warning(f"No result for category: {category_name}")
                except Exception as e:
                    logger.error(f"Error processing category {category_name}: {e}")
        
        return results
        
    except Exception as e:
        logger.error(f"Error during scraping: {e}")
        return []
    finally:
        if driver:
            driver.quit()

def process_single_category(url: str, category_name: str, category_url: str) -> Dict[str, Any]:
    """Processes a single category in its own thread with its own driver instance."""
    driver = None
    try:
        driver = setup_driver()
        driver.get(url)
        time.sleep(3)
        
        product_nav = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "hnf-carousel__tabs-navigation-products"))
        )
        
        category_elements = product_nav.find_elements(By.CSS_SELECTOR, 'div.hnf-carousel-slide a')
        target_element = next(
            (elem for elem in category_elements if elem.text.strip() == category_name), 
            None
        )
        
        if not target_element:
            logger.warning(f"Could not find element for category: {category_name}")
            return None
        
        return extract_subcategories(driver, target_element, category_name)
        
    except Exception as e:
        logger.error(f"Error processing category {category_name}: {e}")
        return None
    finally:
        if driver:
            driver.quit()

def main():
    """Main entry point for the scraper."""
    logger.info("Starting IKEA category scraper...")
    
    if not test_page_access():
        logger.error("Page access test failed. Cannot proceed.")
        return
    
    logger.info("Page access test passed. Proceeding with category scraping...")
    
    categories = get_categories()
    
    if categories:
        output_file = "ikea_product_categories.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(categories, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Successfully scraped {len(categories)} categories and saved to {output_file}")
        
        for category in categories:
            logger.info(f"{category['category_name']}: {len(category['subcategories'])} subcategories")
    else:
        logger.error("No categories were scraped")

if __name__ == "__main__":
    main()



