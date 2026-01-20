-- 1. Expense Categories
-- Defines how an expense should be treated in reports
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'Cleaning', 'Office', 'Cars'
    allocation_type VARCHAR(20) NOT NULL CHECK (allocation_type IN ('PerUnit', 'Distributed')),
    description TEXT
);

-- Seed Categories
INSERT INTO expense_categories (name, allocation_type) VALUES 
('Cleaning', 'PerUnit'),      -- Assigned to specific unit
('Laundry', 'PerUnit'),       -- Assigned to specific unit
('Maintenance', 'PerUnit'),   -- Assigned to specific unit
('Office', 'Distributed'),    -- Overhead, shared across portfolio
('Cars', 'Distributed'),      -- Logistics, shared
('Common', 'Distributed'),    -- General repairs, shared
('Rent_Income', 'PerUnit');   -- Revenue

-- 2. Currency Exchange Rates
-- Historic rates for normalization to USD
CREATE TABLE currency_rates (
    rate_date DATE NOT NULL,
    currency_from VARCHAR(3) NOT NULL, -- 'UAH', 'EUR'
    rate_to_usd DECIMAL(10, 6) NOT NULL, -- Exchange rate multiplier
    PRIMARY KEY (rate_date, currency_from)
);

-- 3. Financial Transactions
-- The master ledger for all costs and revenue
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- When and What
    transaction_date DATE NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    description TEXT,
    
    -- Monetary Values
    amount_original DECIMAL(12, 2) NOT NULL,
    currency_original VARCHAR(3) DEFAULT 'UAH',
    amount_usd DECIMAL(12, 2) NOT NULL, -- Calculated field
    
    -- Context / Attribution
    unit_id UUID REFERENCES property_units(id) ON DELETE SET NULL, -- Null if Global/Group expense
    group_id UUID REFERENCES property_groups(id) ON DELETE SET NULL, -- Null if Global or Specific Unit
    payee_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Linked to Staff (e.g. Cleaner)
    
    -- Audit
    source_file VARCHAR(255), -- e.g. 'Summary Cleaning.txt'
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Optimization for Reports
    CONSTRAINT idx_fin_date_unit UNIQUE (transaction_date, category_id, unit_id, amount_original)
);

-- Index for P&L Reporting speed
CREATE INDEX idx_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_transactions_unit ON financial_transactions(unit_id);
