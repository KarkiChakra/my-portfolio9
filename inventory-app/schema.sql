CREATE TABLE products (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(40) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    arrival_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_history (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_code VARCHAR(40) NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    movement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_history_product
        FOREIGN KEY (product_code)
        REFERENCES products (product_code)
        ON DELETE CASCADE,
    CONSTRAINT chk_stock_history_type
        CHECK (movement_type IN ('ARRIVAL', 'SHIPPING'))
);

CREATE INDEX idx_products_name ON products (product_name);
CREATE INDEX idx_products_code ON products (product_code);
CREATE INDEX idx_stock_history_product_code ON stock_history (product_code);
