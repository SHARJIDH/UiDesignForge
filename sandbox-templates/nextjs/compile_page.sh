#!/bin/bash
#
# E2B start_cmd – runs once when the sandbox first boots.
# E2B then snapshots the running VM (including this process + Next.js children),
# so on resume the processes are just restored from the snapshot.
#
# If the dev server isn't responding yet when E2B takes the snapshot, our
# resume route will restart it via nohup+setsid.

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
cd /home/user

# Replace this shell with npm so E2B monitors the Next.js process directly.
exec npm run dev
