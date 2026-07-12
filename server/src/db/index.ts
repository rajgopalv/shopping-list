import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

let db: Database.Database;

export function getDb(dbPath?: string): Database.Database {
  if (db) return db;

  const resolvedPath = dbPath || process.env.SHOPPING_DB_PATH || defaultPath();

  if (resolvedPath !== ":memory:") {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function defaultPath() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(__dirname, "../../data/shopping.db");
}

export function initDB(dbPath?: string) {
  const d = getDb(dbPath);
  d.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      is_preset INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      is_shopped INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      shopped_at TEXT
    );

    CREATE TABLE IF NOT EXISTS item_names (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      frequency INTEGER DEFAULT 1,
      category_id INTEGER REFERENCES categories(id),
      last_used_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_item_names_name ON item_names(name);
  `);

  // Migrate: add sort_order if missing
  const cols = d.prepare("PRAGMA table_info(stores)").all() as { name: string }[];
  if (!cols.find((c) => c.name === "sort_order")) {
    d.exec("ALTER TABLE stores ADD COLUMN sort_order INTEGER DEFAULT 0");
  }

  const storeCount = d.prepare("SELECT COUNT(*) as count FROM stores").get() as { count: number };
  if (storeCount.count === 0) {
    seedData(d);
  }

  const nameCount = d.prepare("SELECT COUNT(*) as count FROM item_names").get() as { count: number };
  if (nameCount.count === 0) {
    seedItemNames(d);
  }

  return d;
}

export function resetDb() {
  db?.close();
  db = undefined as unknown as Database.Database;
}

function seedData(d: Database.Database) {
  const insertStore = d.prepare("INSERT INTO stores (name, icon, color, sort_order) VALUES (?, ?, ?, ?)");
  insertStore.run("Costco", "🟡", "#F5A623", 0);
  insertStore.run("Fred Meyer", "🔵", "#00A3E0", 1);
  insertStore.run("Indian Stores", "🟠", "#FF6B35", 2);

  const insertCategory = d.prepare("INSERT INTO categories (name, icon, is_preset) VALUES (?, ?, 1)");
  const presets = [
    ["Produce", "🥬"],
    ["Dairy", "🥛"],
    ["Meat & Seafood", "🥩"],
    ["Bakery", "🍞"],
    ["Snacks", "🍿"],
    ["Beverages", "🥤"],
    ["Frozen", "🧊"],
    ["Pantry", "🥫"],
    ["Household", "🏠"],
    ["Personal Care", "🧴"],
  ];
  for (const [name, icon] of presets) {
    insertCategory.run(name, icon);
  }
}

function seedItemNames(d: Database.Database) {
  const insert = d.prepare(
    "INSERT OR IGNORE INTO item_names (name, frequency, category_id, last_used_at) VALUES (?, 1, ?, datetime('now'))"
  );

  const items: [string, number][] = [
    // Produce (1)
    ["Apple", 1], ["Avocado", 1], ["Banana", 1], ["Blueberries", 1], ["Broccoli", 1],
    ["Cabbage", 1], ["Carrots", 1], ["Cauliflower", 1], ["Celery", 1], ["Cilantro", 1],
    ["Cucumber", 1], ["Garlic", 1], ["Ginger", 1], ["Grapes", 1], ["Green Beans", 1],
    ["Jalapeño", 1], ["Kale", 1], ["Lemon", 1], ["Lettuce", 1], ["Lime", 1],
    ["Mushroom", 1], ["Onion", 1], ["Orange", 1], ["Parsley", 1], ["Potato", 1],
    ["Spinach", 1], ["Strawberries", 1], ["Sweet Potato", 1], ["Tomato", 1], ["Zucchini", 1],
    ["Bell Pepper", 1], ["Green Onion", 1], ["Asparagus", 1], ["Corn", 1], ["Peas", 1],
    ["Radish", 1], ["Beets", 1], ["Squash", 1], ["Mango", 1], ["Pineapple", 1],
    ["Watermelon", 1], ["Cantaloupe", 1], ["Honeydew", 1], ["Kiwi", 1], ["Pear", 1],
    ["Peach", 1], ["Plum", 1], ["Cherries", 1], ["Raspberries", 1], ["Blackberries", 1],
    ["Eggplant", 1], ["Brussels Sprouts", 1], ["Romaine", 1], ["Arugula", 1],
    ["Collard Greens", 1], ["Pomegranate", 1], ["Grapefruit", 1], ["Nectarine", 1],
    ["Papaya", 1], ["Artichoke", 1], ["Shallot", 1], ["Scallion", 1], ["Fennel", 1],
    ["Okra", 1], ["Parsnip", 1], ["Turnip", 1], ["Dates", 1], ["Figs", 1], ["Basil", 1],
    ["Mint", 1], ["Dill", 1], ["Thyme", 1], ["Rosemary", 1], ["Chives", 1],

    // Dairy (2)
    ["Milk", 2], ["Whole Milk", 2], ["2% Milk", 2], ["Almond Milk", 2], ["Oat Milk", 2],
    ["Heavy Cream", 2], ["Half & Half", 2], ["Butter", 2], ["Unsalted Butter", 2],
    ["Sour Cream", 2], ["Cream Cheese", 2], ["Yogurt", 2], ["Greek Yogurt", 2],
    ["Cottage Cheese", 2], ["Mozzarella", 2], ["Cheddar Cheese", 2], ["Parmesan", 2],
    ["Feta Cheese", 2], ["Swiss Cheese", 2], ["Provolone", 2], ["Monterey Jack", 2],
    ["String Cheese", 2], ["Ricotta", 2], ["Mascarpone", 2], ["Creamer", 2],
    ["Eggs", 2], ["Egg Whites", 2], ["Whipped Cream", 2], ["Buttermilk", 2],
    ["Condensed Milk", 2], ["Evaporated Milk", 2], ["Coconut Milk", 2], ["Soy Milk", 2],

    // Meat & Seafood (3)
    ["Chicken Breast", 3], ["Chicken Thighs", 3], ["Whole Chicken", 3], ["Ground Beef", 3],
    ["Steak", 3], ["Ribeye", 3], ["Sirloin", 3], ["Pork Chops", 3], ["Pork Tenderloin", 3],
    ["Bacon", 3], ["Sausage", 3], ["Italian Sausage", 3], ["Turkey", 3], ["Ground Turkey", 3],
    ["Salmon", 3], ["Shrimp", 3], ["Tuna", 3], ["Cod", 3], ["Tilapia", 3],
    ["Lamb", 3], ["Ground Lamb", 3], ["Deli Turkey", 3], ["Deli Ham", 3],
    ["Deli Roast Beef", 3], ["Pepperoni", 3], ["Prosciutto", 3], ["Salami", 3],
    ["Hot Dogs", 3], ["Bratwurst", 3], ["Chorizo", 3], ["Beef Jerky", 3],
    ["Chicken Wings", 3], ["Chicken Drumsticks", 3], ["Pork Shoulder", 3],
    ["Brisket", 3], ["Ground Pork", 3], ["Scallops", 3], ["Lobster", 3],
    ["Crab", 3], ["Clams", 3], ["Mussels", 3], ["Halibut", 3], ["Catfish", 3],

    // Bakery (4)
    ["White Bread", 4], ["Wheat Bread", 4], ["Sourdough", 4], ["Baguette", 4],
    ["Tortillas", 4], ["Flour Tortillas", 4], ["Corn Tortillas", 4], ["Bagels", 4],
    ["Croissants", 4], ["English Muffins", 4], ["Dinner Rolls", 4], ["Hamburger Buns", 4],
    ["Hot Dog Buns", 4], ["Pita Bread", 4], ["Naan", 4], ["Ciabatta", 4],
    ["Focaccia", 4], ["Rye Bread", 4], ["Pumpernickel", 4], ["Brioche", 4],
    ["Challah", 4], ["Cornbread", 4], ["Pancake Mix", 4], ["Waffle Mix", 4],
    ["Pie Crust", 4], ["Puff Pastry", 4], ["Croutons", 4], ["Bread Crumbs", 4],

    // Snacks (5)
    ["Chips", 5], ["Potato Chips", 5], ["Tortilla Chips", 5], ["Popcorn", 5],
    ["Crackers", 5], ["Pretzels", 5], ["Mixed Nuts", 5], ["Almonds", 5], ["Cashews", 5],
    ["Peanuts", 5], ["Trail Mix", 5], ["Granola Bars", 5], ["Protein Bars", 5],
    ["Chocolate", 5], ["Dark Chocolate", 5], ["Milk Chocolate", 5], ["Candy", 5],
    ["Cookies", 5], ["Oreos", 5], ["Chips Ahoy", 5], ["Rice Cakes", 5],
    ["Pita Chips", 5], ["Hummus", 5], ["Guacamole", 5], ["Pudding Cups", 5],
    ["Fruit Snacks", 5], ["Dried Fruit", 5], ["Beef Jerky", 5], ["Sunflower Seeds", 5],
    ["Pumpkin Seeds", 5], ["Granola", 5], ["Kettle Corn", 5], ["Cheese Puffs", 5],

    // Beverages (6)
    ["Water", 6], ["Sparkling Water", 6], ["Seltzer", 6], ["Orange Juice", 6],
    ["Apple Juice", 6], ["Cranberry Juice", 6], ["Grape Juice", 6], ["Coffee", 6],
    ["Coffee Beans", 6], ["Ground Coffee", 6], ["Tea", 6], ["Green Tea", 6],
    ["Black Tea", 6], ["Herbal Tea", 6], ["Soda", 6], ["Coke", 6], ["Diet Coke", 6],
    ["Sprite", 6], ["Ginger Ale", 6], ["Gatorade", 6], ["Coconut Water", 6],
    ["Wine", 6], ["Red Wine", 6], ["White Wine", 6], ["Beer", 6],
    ["Sparkling Water", 6], ["Club Soda", 6], ["Tonic Water", 6], ["Energy Drink", 6],
    ["Kombucha", 6], ["Lemonade", 6], ["Iced Tea", 6], ["Hot Chocolate", 6],
    ["Apple Cider", 6], ["Tomato Juice", 6], ["Pineapple Juice", 6],

    // Frozen (7)
    ["Frozen Pizza", 7], ["Frozen Vegetables", 7], ["Frozen Broccoli", 7], ["Frozen Peas", 7],
    ["Frozen Corn", 7], ["Frozen Fruit", 7], ["Frozen Berries", 7], ["Ice Cream", 7],
    ["Vanilla Ice Cream", 7], ["Chocolate Ice Cream", 7], ["Frozen Yogurt", 7],
    ["Frozen Waffles", 7], ["Frozen Pancakes", 7], ["Frozen Chicken Nuggets", 7],
    ["Frozen Fish Sticks", 7], ["Frozen Shrimp", 7], ["Frozen Burritos", 7],
    ["Frozen Taquitos", 7], ["Frozen Fries", 7], ["Tater Tots", 7], ["Hash Browns", 7],
    ["Frozen Pie", 7], ["Frozen Cake", 7], ["Popsicles", 7], ["Frozen Juice", 7],
    ["Frozen Meat", 7], ["Frozen Chicken", 7], ["TV Dinner", 7], ["Frozen Pot Pie", 7],
    ["Frozen Edamame", 7], ["Frozen Mango", 7], ["Frozen Spinach", 7],

    // Pantry (8)
    ["Rice", 8], ["White Rice", 8], ["Brown Rice", 8], ["Jasmine Rice", 8], ["Basmati Rice", 8],
    ["Pasta", 8], ["Spaghetti", 8], ["Penne", 8], ["Fettuccine", 8], ["Linguine", 8],
    ["Macaroni", 8], ["Rigatoni", 8], ["Olive Oil", 8], ["Extra Virgin Olive Oil", 8],
    ["Vegetable Oil", 8], ["Canola Oil", 8], ["Coconut Oil", 8], ["Sesame Oil", 8],
    ["Salt", 8], ["Kosher Salt", 8], ["Sea Salt", 8], ["Black Pepper", 8],
    ["Spices", 8], ["Cinnamon", 8], ["Paprika", 8], ["Cumin", 8], ["Chili Powder", 8],
    ["Garlic Powder", 8], ["Onion Powder", 8], ["Oregano", 8], ["Basil", 8],
    ["Italian Seasoning", 8], ["Curry Powder", 8], ["Turmeric", 8], ["Bay Leaves", 8],
    ["Soy Sauce", 8], ["Hot Sauce", 8], ["Sriracha", 8], ["Ketchup", 8], ["Mustard", 8],
    ["Dijon Mustard", 8], ["Mayo", 8], ["Mayonnaise", 8], ["Peanut Butter", 8],
    ["Jam", 8], ["Strawberry Jam", 8], ["Grape Jelly", 8], ["Honey", 8], ["Maple Syrup", 8],
    ["Flour", 8], ["All-Purpose Flour", 8], ["Bread Flour", 8], ["Sugar", 8],
    ["Granulated Sugar", 8], ["Brown Sugar", 8], ["Powdered Sugar", 8],
    ["Baking Soda", 8], ["Baking Powder", 8], ["Vanilla Extract", 8],
    ["Canned Tomatoes", 8], ["Diced Tomatoes", 8], ["Crushed Tomatoes", 8],
    ["Tomato Paste", 8], ["Tomato Sauce", 8], ["Canned Beans", 8], ["Black Beans", 8],
    ["Kidney Beans", 8], ["Chickpeas", 8], ["Pinto Beans", 8], ["Lentils", 8],
    ["Chicken Broth", 8], ["Vegetable Broth", 8], ["Beef Broth", 8], ["Oats", 8],
    ["Rolled Oats", 8], ["Steel Cut Oats", 8], ["Cereal", 8], ["Granola", 8],
    ["Pasta Sauce", 8], ["Marinara", 8], ["Alfredo Sauce", 8], ["Salsa", 8],
    ["Pickles", 8], ["Olives", 8], ["Capers", 8], ["Anchovies", 8],
    ["Coconut Milk", 8], ["Fish Sauce", 8], ["Rice Vinegar", 8], ["Balsamic Vinegar", 8],
    ["Red Wine Vinegar", 8], ["White Vinegar", 8], ["Cornstarch", 8], ["Gelatin", 8],
    ["Cocoa Powder", 8], ["Chocolate Chips", 8], ["Raisins", 8], ["Cranberries", 8],
    ["Nuts", 8], ["Walnuts", 8], ["Pecans", 8], ["Pine Nuts", 8],

    // Household (9)
    ["Paper Towels", 9], ["Toilet Paper", 9], ["Napkins", 9], ["Tissues", 9],
    ["Trash Bags", 9], ["Kitchen Trash Bags", 9], ["Ziploc Bags", 9],
    ["Sandwich Bags", 9], ["Gallon Bags", 9], ["Aluminum Foil", 9], ["Plastic Wrap", 9],
    ["Parchment Paper", 9], ["Wax Paper", 9], ["Dish Soap", 9], ["Dishwasher Detergent", 9],
    ["Dishwasher Pods", 9], ["Laundry Detergent", 9], ["Fabric Softener", 9],
    ["Dryer Sheets", 9], ["Bleach", 9], ["All-Purpose Cleaner", 9], ["Glass Cleaner", 9],
    ["Sponges", 9], ["Scrub Brushes", 9], ["Dish Rags", 9], ["Paper Plates", 9],
    ["Plastic Cups", 9], ["Plastic Utensils", 9], ["Straws", 9], ["Cling Wrap", 9],
    ["Freezer Bags", 9], ["Baking Soda", 9], ["White Vinegar", 9], ["Matches", 9],
    ["Lighter", 9], ["Candles", 9], ["Batteries", 9], ["Lightbulbs", 9],
    ["Fire Extinguisher", 9], ["First Aid Kit", 9], ["Garbage Bags", 9],

    // Personal Care (10)
    ["Shampoo", 10], ["Conditioner", 10], ["Body Wash", 10], ["Bar Soap", 10],
    ["Hand Soap", 10], ["Deodorant", 10], ["Toothpaste", 10], ["Toothbrush", 10],
    ["Electric Toothbrush", 10], ["Mouthwash", 10], ["Floss", 10], ["Lotion", 10],
    ["Body Lotion", 10], ["Face Lotion", 10], ["Sunscreen", 10], ["Razor", 10],
    ["Shaving Cream", 10], ["Shaving Gel", 10], ["Tissues", 10], ["Q-Tips", 10],
    ["Cotton Balls", 10], ["Cotton Swabs", 10], ["Tampons", 10], ["Pads", 10],
    ["Advil", 10], ["Ibuprofen", 10], ["Tylenol", 10], ["Acetaminophen", 10],
    ["Vitamins", 10], ["Multivitamin", 10], ["Vitamin D", 10], ["Vitamin C", 10],
    ["Melatonin", 10], ["Allergy Medicine", 10], ["Cold Medicine", 10],
    ["Cough Drops", 10], ["Band-Aids", 10], ["Neosporin", 10], ["Hydrocortisone", 10],
    ["Makeup Remover", 10], ["Cotton Rounds", 10], ["Nail Clippers", 10],
    ["Tweezers", 10], ["Hair Gel", 10], ["Hair Spray", 10], ["Dry Shampoo", 10],
  ];

  const tx = d.transaction(() => {
    for (const [name, categoryId] of items) {
      insert.run(name, categoryId);
    }
  });
  tx();
}
