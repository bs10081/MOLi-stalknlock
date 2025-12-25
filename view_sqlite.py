import sqlite3

DB_PATH = "moli.db"

def list_tables(conn):
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    return [row[0] for row in cur.fetchall()]

def show_schema(conn, table_name):
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table_name});")
    cols = cur.fetchall()
    if not cols:
        print(f"No schema for table: {table_name}")
        return

    print(f"\nSchema of table '{table_name}':")
    print("cid | name | type | notnull | default | pk")
    for cid, name, ctype, notnull, dflt, pk in cols:
        print(f"{cid} | {name} | {ctype} | {notnull} | {dflt} | {pk}")

def show_rows(conn, table_name, limit=20):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table_name} LIMIT ?;", (limit,))
    rows = cur.fetchall()
    col_names = [d[0] for d in cur.description]

    print(f"\nFirst {limit} rows of '{table_name}':")
    if not rows:
        print("(no data)")
        return

    print(" | ".join(col_names))
    for r in rows:
        print(" | ".join(str(x) for x in r))

def main():
    conn = sqlite3.connect(DB_PATH)
    try:
        tables = list_tables(conn)
        print("Tables in database:")
        for i, t in enumerate(tables, start=1):
            print(f"{i}. {t}")

        choice = input("\nEnter table name to view (or just ENTER to quit): ").strip()
        if not choice:
            return

        if choice not in tables:
            print("Table not found.")
            return

        show_schema(conn, choice)

        limit_str = input("\nHow many rows to show (default 20): ").strip() or "20"
        try:
            limit = int(limit_str)
        except ValueError:
            limit = 20

        show_rows(conn, choice, limit=limit)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
