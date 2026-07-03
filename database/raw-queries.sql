-- ============================================================================
-- WORKFORCE MANAGEMENT - RAW MYSQL QUERIES & INDEX OPTIMIZATIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Get Paginated Access Logs with Employee Details
-- Powers: GET /api/v1/iot/logs
--
-- Description:
-- Retrieves chronological access control events, linking to Employee details,
-- filtered by device and status, sorted to display latest events first.
-- ----------------------------------------------------------------------------

SELECT 
    al.id AS log_id,
    al.device_id AS device_id,
    al.device_type AS device_type,
    al.direction AS direction,
    al.status AS status,
    al.captured_image AS captured_image,
    al.created_at AS scan_timestamp,
    emp.name AS employee_name,
    emp.email AS employee_email,
    emp.employee_code AS employee_code,
    emp.department AS department
FROM 
    access_logs al
LEFT JOIN 
    employees emp ON al.employee_id = emp.id
WHERE 
    al.status = 'granted'
    AND al.device_type = 'rfid'
ORDER BY 
    al.created_at DESC
LIMIT 20 OFFSET 0;

-- Optimization Indexes:
CREATE INDEX idx_access_logs_device_created ON access_logs(device_id, created_at);
-- Helps: High-speed range filtering by entrance terminal device ID and chronological sorting.
-- MySQL without it: Scans the entire access logs table and runs a filesort algorithm to sort scans chronologically.
-- With it, MySQL performs a fast index lookup (ref lookup on device_id) and reads records already in sorted order
-- from the index leaf nodes, avoiding filesort.

CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
-- Helps: Global chronological dashboards that display real-time scan feeds.
-- MySQL without it: Executes full table scan and filesort. With it, scans are read directly from the index nodes.


-- ----------------------------------------------------------------------------
-- 2. Access Denial Alerts (Last Hour)
--
-- Description:
-- Finds all denied entrance attempts in the last 60 minutes. Critical for 
-- security dashboards to alert security personnel of badge tampering/unauthorized access.
-- ----------------------------------------------------------------------------

SELECT 
    al.id AS log_id,
    al.device_id AS device_id,
    al.device_type AS device_type,
    al.direction AS direction,
    al.created_at AS alert_timestamp,
    emp.name AS attempted_employee,
    emp.employee_code AS attempted_code
FROM 
    access_logs al
LEFT JOIN 
    employees emp ON al.employee_id = emp.id
WHERE 
    al.status = 'denied'
    AND al.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY 
    al.created_at DESC;

-- Optimization Indexes:
CREATE INDEX idx_access_logs_status_created ON access_logs(status, created_at);
-- Helps: Finding failed access hits inside a recent time frame.
-- MySQL without it: Scans the entire table (O(N)), checking every record.
-- With it, MySQL runs an index range scan starting directly at ('denied', NOW() - 1 Hour), returning in O(log N).


-- ----------------------------------------------------------------------------
-- 3. Daily Roll Call (Employees Checked In Today)
--
-- Description:
-- Returns a list of employees who have successfully checked in ('direction = in' 
-- and 'status = granted') today.
-- ----------------------------------------------------------------------------

SELECT DISTINCT
    emp.id AS employee_id,
    emp.name AS employee_name,
    emp.employee_code AS employee_code,
    emp.department AS department,
    MIN(al.created_at) AS first_check_in
FROM 
    employees emp
INNER JOIN 
    access_logs al ON al.employee_id = emp.id
WHERE 
    al.direction = 'in'
    AND al.status = 'granted'
    AND al.created_at >= CURDATE()
GROUP BY 
    emp.id
ORDER BY 
    first_check_in ASC;

-- Optimization Indexes:
CREATE INDEX idx_access_logs_direction_status ON access_logs(direction, status, created_at);
-- Helps: The filtering clause ('in', 'granted', today) and JOIN lookup on employee_id.
-- MySQL without it: Full scan on access_logs, filtering and joining in memory.
-- With it, MySQL performs a fast index range scan to fetch today's entries directly.


-- ----------------------------------------------------------------------------
-- 4. Missing Personnel (Absent Employees Today)
--
-- Description:
-- Finds all active employees who have NOT checked in yet today. Helps operations
-- managers track absenteeism or missing staff.
-- ----------------------------------------------------------------------------

SELECT 
    emp.id AS employee_id,
    emp.name AS employee_name,
    emp.employee_code AS employee_code,
    emp.department AS department
FROM 
    employees emp
WHERE 
    NOT EXISTS (
        SELECT 1 
        FROM access_logs al 
        WHERE 
            al.employee_id = emp.id
            AND al.direction = 'in'
            AND al.status = 'granted'
            AND al.created_at >= CURDATE()
    );

-- Optimization Indexes:
CREATE INDEX idx_access_logs_employee_created ON access_logs(employee_id, created_at);
-- Helps: The subquery check mapping employee_id to date.
-- MySQL without it: For every employee, MySQL scans the entire access_logs table.
-- With it, MySQL performs constant-time index lookups, ensuring high performance.
