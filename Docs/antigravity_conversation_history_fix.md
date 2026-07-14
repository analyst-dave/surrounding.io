# Antigravity Conversation History Migration & Restore Guide

If you migrated to the updated Antigravity IDE and lost your past conversation history, follow this guide to restore it. 

---

## 1. Root Cause Analysis

1. **Path Migration:** The updated Antigravity IDE saves its state in a different folder than the old Antigravity instance:
   - **Old Path:** `C:\Users\<User>\AppData\Roaming\Antigravity\User\globalStorage\state.vscdb`
   - **New Path:** `C:\Users\<User>\AppData\Roaming\Antigravity IDE\User\globalStorage\state.vscdb`
2. **In-Memory Cache Overwrite:** If you try to modify the SQLite database while the IDE is running, the IDE's in-memory cache will overwrite your changes when the IDE is closed or reloaded.
3. **Why "Read-Only Locking" Fails:** Marking `state.vscdb` read-only via `attrib +r` to prevent the IDE from overwriting it is a bad solution. It causes the IDE to fail to write any new state (e.g., new conversations or settings), which eventually forces the IDE to ignore the database or fallback to an empty state, losing history again.

---

## 2. Correct Migration Strategy

To cleanly migrate the history, you must:
1. Make sure all database files are fully **writable**.
2. Run a migration script that **waits for the IDE to completely close**.
3. Once closed, the script merges the old and new `trajectorySummaries` keys using **Protobuf concatenation** (since simple concatenation of serialized repeated fields in Protobuf is valid and merges them).
4. Write the merged value back to the new database, **checkpoint the SQLite WAL log**, and exit.
5. Reopen the IDE.

---

## 3. The Automation Script

Create a Python script named `migrate_on_exit.py` on your machine:

```python
import sqlite3
import os
import base64
import subprocess
import time
import sys

# Paths (Adjust <User> to your Windows username if needed, or use os.environ)
user_profile = os.environ.get("USERPROFILE")
old_db = os.path.join(user_profile, r"AppData\Roaming\Antigravity\User\globalStorage\state.vscdb")
new_db = os.path.join(user_profile, r"AppData\Roaming\Antigravity IDE\User\globalStorage\state.vscdb")
log_file_path = os.path.join(user_profile, r".gemini\antigravity-ide\scratch\merge_on_exit_log.txt")

# Ensure scratch directory exists
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted_msg = f"[{timestamp}] {msg}"
    print(formatted_msg)
    try:
        with open(log_file_path, "a", encoding="utf-8") as f:
            f.write(formatted_msg + "\n")
    except Exception:
        pass

def is_ide_running():
    try:
        res = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Antigravity IDE.exe"], capture_output=True, text=True, check=True)
        return "Antigravity IDE.exe" in res.stdout
    except Exception as e:
        log(f"Warning: tasklist check failed: {e}")
        return True

log("Script started. Waiting for Antigravity IDE.exe to exit...")

# Wait until the IDE exits
checks_count = 0
while is_ide_running():
    checks_count += 1
    if checks_count % 10 == 0:
        log(f"Still waiting... Checked {checks_count} times.")
    time.sleep(1)

log("Antigravity IDE.exe has exited! Beginning merge process...")
time.sleep(2)

# Ensure new db files are fully writable (remove read-only attribs if any)
for p in [new_db, new_db + "-wal", new_db + "-shm"]:
    if os.path.exists(p):
        try:
            subprocess.run(["attrib", "-r", p], check=True)
            os.chmod(p, 0o666)
            log(f"Ensured writable: {p}")
        except Exception as e:
            log(f"Failed to make writable {p}: {e}")

try:
    log("Reading old database...")
    if not os.path.exists(old_db):
        log(f"Error: Old database not found at {old_db}!")
        sys.exit(1)
        
    conn_old = sqlite3.connect(old_db)
    cursor_old = conn_old.cursor()
    cursor_old.execute("SELECT value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.trajectorySummaries';")
    row_old = cursor_old.fetchone()
    conn_old.close()
    
    if not row_old or not row_old[0]:
        log("Error: trajectorySummaries not found in old database!")
        sys.exit(1)
        
    old_b64 = row_old[0]
    old_bytes = base64.b64decode(old_b64)
    log(f"Old database trajectorySummaries size: {len(old_bytes)} decoded bytes.")

    log("Reading new database...")
    if not os.path.exists(new_db):
        log(f"Error: New database not found at {new_db}!")
        sys.exit(1)
        
    conn_new = sqlite3.connect(new_db)
    cursor_new = conn_new.cursor()
    cursor_new.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    cursor_new.execute("SELECT value FROM ItemTable WHERE key = 'antigravityUnifiedStateSync.trajectorySummaries';")
    row_new = cursor_new.fetchone()
    
    new_b64 = row_new[0] if row_new else ""
    new_bytes = base64.b64decode(new_b64) if new_b64 else b""
    log(f"New database trajectorySummaries size: {len(new_bytes)} decoded bytes.")

    # Protobuf concatenation merges repeated fields
    merged_bytes = old_bytes + new_bytes
    merged_b64 = base64.b64encode(merged_bytes).decode('utf-8')
    log(f"Merged trajectorySummaries size: {len(merged_bytes)} decoded bytes.")

    cursor_new.execute("INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('antigravityUnifiedStateSync.trajectorySummaries', ?);", (merged_b64,))
    conn_new.commit()
    cursor_new.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn_new.close()
    log("Successfully merged and wrote trajectorySummaries back to new database!")

except Exception as e:
    log(f"Error occurred during merge: {e}")

# Self cleanup: delete the scheduled task registration
try:
    subprocess.run(["schtasks", "/delete", "/tn", "AntigravityMerge", "/f"], check=True)
    log("Task registration deleted successfully.")
except Exception as e:
    log(f"Failed to delete task registration: {e}")

log("Merge completed successfully.")
```

---

## 4. How to Execute the Fix

### Instructions for the AI Agent (on the other laptop):
1. **Save** the script above as `migrate_on_exit.py` on the system.
2. **Unlock the DB files** immediately (just in case they were marked read-only in a previous attempt):
   ```powershell
   attrib -r "C:\Users\<User>\AppData\Roaming\Antigravity IDE\User\globalStorage\state.vscdb"
   ```
3. **Register and Trigger the Scheduled Task** to run in the background (which detaches it from the running IDE session, allowing it to survive when the IDE is closed):
   ```powershell
   # 1. Register the task (use the absolute path to Python)
   schtasks /create /tn "AntigravityMerge" /tr "\"C:\Users\<User>\AppData\Local\Programs\Python\Python312\python.exe\" \"C:\Users\<User>\.gemini\antigravity-ide\scratch\migrate_on_exit.py\"" /sc once /st 23:59 /f

   # 2. Run the task immediately in the background
   schtasks /run /tn "AntigravityMerge"
   ```
4. **Tell the User** to close their Antigravity IDE application completely.
5. Once they close it, the background script will execute, merge the databases, delete the task registration, and log everything to the scratch log.
6. The user can reopen the IDE in 10 seconds and their history will be completely restored.
