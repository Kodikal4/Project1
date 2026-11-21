-- Disable foreign key checks temporarily to allow dropping tables in any order
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bill_disputes;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS negotiation_messages;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS project_photos;
DROP TABLE IF EXISTS room_areas;
DROP TABLE IF EXISTS flooring_requests;
DROP TABLE IF EXISTS flooring_products;
DROP TABLE IF EXISTS clients;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- 1. CLIENTS TABLE
-- ====================================================================
CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    credit_card_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO clients (first_name, last_name, address, phone_number, email, credit_card_token)
VALUES ('Jane', 'Doe', '123 Oak St', '555-0199', 'jane.doe@example.com', 'tok_test_123');

-- ====================================================================
-- 2. FLOORING PRODUCTS CATALOG TABLE
-- ====================================================================
CREATE TABLE flooring_products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    manufacturer_brand VARCHAR(100),
    material_style VARCHAR(100),
    color VARCHAR(50),
    unit_price DECIMAL(10, 2) NOT NULL,
    pricing_unit VARCHAR(20) NOT NULL,
    dimensions VARCHAR(50),
    sqft_coverage_per_box DECIMAL(8, 2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO flooring_products (product_name, category, unit_price, pricing_unit, dimensions, sqft_coverage_per_box, description)
VALUES ('Oak Ridge LVP', 'Luxury Vinyl Plank', 4.50, 'sqft', '7x48 in', 24.00, 'Waterproof plank flooring');

-- ====================================================================
-- 3. FLOORING REQUESTS TABLE
-- ====================================================================
CREATE TABLE flooring_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    service_address TEXT NOT NULL,
    preferred_date_range VARCHAR(100),
    proposed_budget DECIMAL(10, 2),
    total_requested_area DECIMAL(10, 2),
    status VARCHAR(30) DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);

-- ====================================================================
-- 4. ROOMS / AREAS TABLE
-- ====================================================================
CREATE TABLE room_areas (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    product_id INT NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    length DECIMAL(8, 2),
    width DECIMAL(8, 2),
    total_square_footage DECIMAL(10, 2) NOT NULL,
    current_flooring_type VARCHAR(100),
    removal_required BOOLEAN DEFAULT FALSE,
    installation_pattern VARCHAR(50) DEFAULT 'Straight',
    FOREIGN KEY (request_id) REFERENCES flooring_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES flooring_products(product_id)
);

-- ====================================================================
-- 5. PROJECT PHOTOS TABLE
-- ====================================================================
CREATE TABLE project_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES flooring_requests(request_id) ON DELETE CASCADE
);

-- ====================================================================
-- 6. QUOTES TABLE (Version-Controlled)
-- ====================================================================
CREATE TABLE quotes (
    quote_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    quote_version INT NOT NULL DEFAULT 1,
    quote_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waste_percentage DECIMAL(5, 2) DEFAULT 10.00,
    estimated_material_cost DECIMAL(10, 2) NOT NULL,
    estimated_labor_cost DECIMAL(10, 2) NOT NULL,
    other_charges_discounts DECIMAL(10, 2) DEFAULT 0.00,
    total_quoted_price DECIMAL(10, 2) NOT NULL,
    proposed_installation_window VARCHAR(100),
    note TEXT,
    status VARCHAR(30) DEFAULT 'Pending',
    FOREIGN KEY (request_id) REFERENCES flooring_requests(request_id) ON DELETE CASCADE
);

-- ====================================================================
-- 7. QUOTE LINE ITEMS TABLE
-- ====================================================================
CREATE TABLE quote_items (
    quote_item_id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

-- ====================================================================
-- 8. NEGOTIATION / COUNTERPROPOSAL MESSAGES
-- ====================================================================
CREATE TABLE negotiation_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    sender_type ENUM('Client', 'Contractor') NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES flooring_requests(request_id) ON DELETE CASCADE
);

-- ====================================================================
-- 9. ORDERS TABLE (Service Agreements)
-- ====================================================================
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL UNIQUE,
    client_id INT NOT NULL,
    service_address TEXT NOT NULL,
    agreed_price DECIMAL(10, 2) NOT NULL,
    scheduled_installation_date DATE,
    actual_installation_date DATE,
    project_completion_date DATE,
    actual_material_quantity_used DECIMAL(10, 2),
    completion_notes TEXT,
    status VARCHAR(30) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(quote_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ====================================================================
-- 10. BILLS TABLE (Version-Controlled)
-- ====================================================================
CREATE TABLE bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    bill_version INT NOT NULL DEFAULT 1,
    billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_billed_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Unpaid',
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- ====================================================================
-- 11. BILL DISPUTES & RESPONSES TABLE
-- ====================================================================
CREATE TABLE bill_disputes (
    dispute_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    author_type ENUM('Client', 'Contractor') NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- ====================================================================
-- 12. PAYMENTS TABLE
-- ====================================================================
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL UNIQUE,
    client_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) DEFAULT 'Credit Card',
    status VARCHAR(30) DEFAULT 'Success',
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);