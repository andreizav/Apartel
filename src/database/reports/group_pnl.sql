-- P&L Report: Monthly Net Profit for a Specific Group (e.g., 'Art Apartments')
-- Logic:
-- 1. Direct Revenue: Sum of 'Rent_Income' for units in group.
-- 2. Direct Expenses: Sum of 'PerUnit' expenses (Cleaning, Laundry) for units in group.
-- 3. Overhead Allocation: 
--    (Total Distributed Expenses / Total Units in System) * Units in Target Group.

WITH params AS (
    SELECT 
        'Art Apartments' as target_group_name,
        '2023-10-01'::DATE as report_month_start,
        '2023-10-31'::DATE as report_month_end
),
group_info AS (
    SELECT 
        g.id as group_id, 
        COUNT(u.id) as unit_count
    FROM property_groups g
    JOIN property_units u ON u.group_id = g.id
    WHERE g.name = (SELECT target_group_name FROM params)
    GROUP BY g.id
),
system_info AS (
    SELECT COUNT(id) as total_system_units FROM property_units WHERE type = 'Rental'
),
monthly_financials AS (
    SELECT 
        ft.*, 
        ec.name as category_name, 
        ec.allocation_type
    FROM financial_transactions ft
    JOIN expense_categories ec ON ft.category_id = ec.id
    WHERE ft.transaction_date BETWEEN (SELECT report_month_start FROM params) AND (SELECT report_month_end FROM params)
)
SELECT 
    TO_CHAR(report_month_start, 'Month YYYY') as Period,
    
    -- 1. Revenue
    COALESCE(SUM(CASE WHEN category_name = 'Rent_Income' AND unit_id IN (SELECT id FROM property_units WHERE group_id = (SELECT group_id FROM group_info)) THEN amount_usd ELSE 0 END), 0) as Revenue,
    
    -- 2. Direct Expenses (Cleaning, Laundry)
    COALESCE(SUM(CASE WHEN allocation_type = 'PerUnit' AND unit_id IN (SELECT id FROM property_units WHERE group_id = (SELECT group_id FROM group_info)) THEN amount_usd ELSE 0 END), 0) as Direct_Expenses,
    
    -- 3. Calculated Overhead
    -- Formula: (Total Distributed Costs / Total Units) * Group Units
    (
        SELECT COALESCE(SUM(amount_usd), 0) 
        FROM monthly_financials 
        WHERE allocation_type = 'Distributed'
    ) 
    / (SELECT total_system_units FROM system_info) 
    * (SELECT unit_count FROM group_info) 
    as Allocated_Overhead,

    -- 4. Net Profit
    (
        -- Revenue
        COALESCE(SUM(CASE WHEN category_name = 'Rent_Income' AND unit_id IN (SELECT id FROM property_units WHERE group_id = (SELECT group_id FROM group_info)) THEN amount_usd ELSE 0 END), 0)
        -
        -- Direct Expenses
        COALESCE(SUM(CASE WHEN allocation_type = 'PerUnit' AND unit_id IN (SELECT id FROM property_units WHERE group_id = (SELECT group_id FROM group_info)) THEN amount_usd ELSE 0 END), 0)
        -
        -- Overhead
        ((SELECT COALESCE(SUM(amount_usd), 0) FROM monthly_financials WHERE allocation_type = 'Distributed') / (SELECT total_system_units FROM system_info) * (SELECT unit_count FROM group_info))
    ) as Net_Profit

FROM params, group_info, system_info, monthly_financials
GROUP BY params.report_month_start, group_info.unit_count, system_info.total_system_units;
