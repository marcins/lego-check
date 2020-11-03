# LEGO Check

Pulls set details from LEGO site, works out if the status has changed, and sends a push notification via [Pushover](https://pushover.net/) if it has.

## Usage

Currently the set number is hardcoded in `index.js`, and it only supports tracking one set, but would be easy enough to expand.

Supports an optional `--send-update` flag to force sending the current status (e.g. if you want to be notified once a day regardless to make sure your script is still working :) )

Run it on a schedule with `cron` on your system.