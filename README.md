# CampusRide — Student Travel Booking (Demo)

CampusRide is a front-end demo of a student-focused travel booking site. It uses plain HTML/CSS/JavaScript and LocalStorage to simulate users, bookings, wallets and transactions so you can prototype flows without a backend.

Highlights (recent updates):
- Student registration and demo authentication (LocalStorage)
- Ride search, availability and booking flow
- QR ticket generation and print/download
- Mock payment methods (UPI, Card, Netbanking, Wallet)
- Student Wallet: top-up and balance handling
- Coupons: create/apply demo coupons
- Transaction history with filters, date presets, pagination
- Per-user preferences: transactions page-size and selected export columns
- CSV export of filtered transactions (selected columns)
- Client-side PDF export of filtered transactions (html2canvas + jsPDF)

Tech stack
- HTML5, CSS3, vanilla JavaScript
- No build step required — static files only
- Libraries included via CDN: Font Awesome, jsPDF, html2canvas

LocalStorage keys used (for debugging / reset):
- `cr_users` — array of user objects
- `cr_currentUser` — currently logged-in user
- `cr_bookings` — bookings array
- `cr_wallets` — mapping userId → balance
- `cr_coupons` — coupons array
- `cr_transactions` — transactions array
- `cr_user_settings` — per-user prefs (txPerPage, selectedTxColumns)

Run locally (recommended)
1. Open a terminal in the project root.
2. Start a simple static server (example uses Python):

```bash
cd /workspaces/demo_project
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes & next steps
- This is a client-side prototype. For production, implement a server (Node/Firebase) and replace LocalStorage with a database and proper auth.
- PDF export uses a screenshot approach via `html2canvas`; for large result sets consider `jsPDF` + `autoTable` for better tabular output.

License & contact
This demo is provided for educational purposes. Feel free to fork and adapt it for prototypes.

Enjoy — open `index.html` or serve the directory and try the flows (register, top-up wallet, book a ride, export transactions).
