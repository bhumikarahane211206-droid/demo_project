// CampusRide demo app (vanilla JS + localStorage)
(function(){
  const state = {
    users: JSON.parse(localStorage.getItem('cr_users')||'[]'),
    bookings: JSON.parse(localStorage.getItem('cr_bookings')||'[]'),
    rides: [],
    wallets: JSON.parse(localStorage.getItem('cr_wallets')||'{}'),
    coupons: JSON.parse(localStorage.getItem('cr_coupons')||'null') || [],
    transactions: JSON.parse(localStorage.getItem('cr_transactions')||'[]'),
    txPage: 1,
    txPerPage: 5
  }

  // sample rides
  state.rides = [
    {id:'R001',vehicle:'Campus Express',type:'bus',driver:'Ravi Kumar',vehicleNo:'KA-01-CC-1234',seats:30,available:6,fare:30,arrival:'07:30 AM',rating:4.6,route:'Home ↔ College A'},
    {id:'R002',vehicle:'City Cab',type:'cab',driver:'Meera Singh',vehicleNo:'KA-02-DD-5678',seats:4,available:3,fare:120,arrival:'08:15 AM',rating:4.8,route:'Downtown ↔ Campus'},
    {id:'R003',vehicle:'North Rider',type:'bus',driver:'Suresh',vehicleNo:'KA-03-EE-9012',seats:28,available:10,fare:25,arrival:'09:00 AM',rating:4.4,route:'Northside ↔ College B'}
  ];

  // sample coupons (persist if not present)
  if(state.coupons.length===0){
    state.coupons = [
      {code:'STUDENT50',type:'percent',value:50,desc:'50% off (max ₹50)',active:true},
      {code:'FLAT20',type:'fixed',value:20,desc:'₹20 off on any ride',active:true}
    ];
    localStorage.setItem('cr_coupons', JSON.stringify(state.coupons));
  }

  // helpers
  const $ = sel=>document.querySelector(sel);
  const $$ = sel=>document.querySelectorAll(sel);

  // init
  function init(){
    $('#year').textContent = new Date().getFullYear();
    bindUI();
    renderResults(state.rides);
  }

  function bindUI(){
    $('#registerBtn').onclick = ()=>openAuth('register');
    $('#quickRegisterBtn').onclick = ()=>openAuth('register');
    $('#loginBtn').onclick = ()=>openAuth('login');
    $('#searchRideBtn').onclick = ()=>location.href='#routes';
    $('#doSearch').onclick = doSearch;
    $$('.modal-close').forEach(b=>b.onclick = closeModals);
    $('#authForm').addEventListener('submit', onAuthSubmit);
    $('#results').addEventListener('click', onResultsClick);
    $('#printTicket')?.addEventListener('click', printTicket);
    // payment form
    const paymentForm = $('#paymentForm');
    paymentForm && paymentForm.addEventListener('submit', onPaymentSubmit);
    // toggle payment fields
    document.querySelectorAll('input[name="pmethod"]').forEach(r=>r.addEventListener('change', onPaymentMethodChange));
    // wallet & coupons
    $('#walletBtn').addEventListener('click', ()=>openWallet());
    $('#dashboardBtn')?.addEventListener('click', ()=>openDashboard());
    // transaction filters and pagination
    $('#txFilterType')?.addEventListener('change', ()=>{ state.txPage=1; renderTransactionList(); });
    $('#txFilterFrom')?.addEventListener('change', ()=>{ state.txPage=1; renderTransactionList(); });
    $('#txFilterTo')?.addEventListener('change', ()=>{ state.txPage=1; renderTransactionList(); });
    $('#txFilterSearch')?.addEventListener('input', ()=>{ state.txPage=1; renderTransactionList(); });
    $('#txFilterClear')?.addEventListener('click', ()=>{ clearTxFilters(); });
    $('#txPrevBtn')?.addEventListener('click', ()=>{ if(state.txPage>1){ state.txPage--; renderTransactionList(); } });
    $('#txNextBtn')?.addEventListener('click', ()=>{ state.txPage++; renderTransactionList(); });
    $('#addFundsForm')?.addEventListener('submit', onAddFunds);
    $('#applyCouponBtn')?.addEventListener('click', onApplyCoupon);
    $('#createCouponBtn')?.addEventListener('click', onCreateCoupon);
      // date presets
      $('#preset7')?.addEventListener('click', ()=>{ applyDatePreset('last7'); });
      $('#presetThisMonth')?.addEventListener('click', ()=>{ applyDatePreset('thisMonth'); });
      $('#presetLastMonth')?.addEventListener('click', ()=>{ applyDatePreset('lastMonth'); });
      $('#presetAll')?.addEventListener('click', ()=>{ applyDatePreset('all'); });
      // per-page and export
      $('#txPerPageSelect')?.addEventListener('change', (e)=>{ state.txPerPage = parseInt(e.target.value)||5; state.txPage=1; renderTransactionList(); });
      $('#txExportBtn')?.addEventListener('click', ()=>{ exportTransactionsCSV(); });
  }

  function openAuth(mode){
    const modal = $('#authModal');
    modal.classList.add('show');
    $('#modalTitle').textContent = mode==='login' ? 'Login' : 'Register';
    if(mode==='login'){
      // reuse form: hide some fields
    }
  }

  function closeModals(){
    $$('.modal').forEach(m=>m.classList.remove('show'));
  }

  function onAuthSubmit(e){
    e.preventDefault();
    const u = {
      id: 'U'+Date.now(),
      name: $('#fullName').value,
      college: $('#collegeName').value,
      studentId: $('#studentId').value,
      email: $('#email').value,
      mobile: $('#mobile').value,
      password: $('#password').value
    };
    if($('#password').value !== $('#confirmPassword').value){alert('Passwords do not match');return}
    state.users.push(u);
    localStorage.setItem('cr_users', JSON.stringify(state.users));
    // init wallet for user
    state.wallets[u.id] = state.wallets[u.id] || 0;
    localStorage.setItem('cr_wallets', JSON.stringify(state.wallets));
    alert('Registered successfully. You are logged in (demo).');
    closeModals();
    localStorage.setItem('cr_currentUser', JSON.stringify(u));
    renderDashboard();
    updateWalletUI();
  }

  function doSearch(){
    const pickup = $('#pickup').value.toLowerCase();
    const drop = $('#drop').value.toLowerCase();
    const college = $('#college').value.toLowerCase();
    const vehicleType = $('#vehicleType').value;
    const seats = parseInt($('#seats').value)||1;
    let results = state.rides.filter(r=>r.available>=seats);
    if(vehicleType!=='any') results = results.filter(r=>r.type===vehicleType);
    if(college) results = results.filter(r=>r.route.toLowerCase().includes(college));
    renderResults(results);
  }

  function renderResults(list){
    const container = $('#results');
    container.innerHTML = '';
    if(list.length===0){container.innerHTML = '<p class="muted">No rides found for selected options.</p>';return}
    list.forEach(r=>{
      const card = document.createElement('div');card.className='card glass';
      card.innerHTML = `
        <div class="vehicle-header"><strong>${r.vehicle} <span class="muted">(${r.type})</span></strong><div><strong>₹${r.fare}</strong></div></div>
        <div>${r.route}</div>
        <div class="muted">Driver: ${r.driver} · ${r.vehicleNo} · Arrival: ${r.arrival} · Seats: ${r.available}</div>
        <div style="margin-top:.6rem"><button class="btn btn-primary book-btn" data-id="${r.id}">Book Now</button></div>
      `;
      container.appendChild(card);
    })
  }

  function onResultsClick(e){
    const btn = e.target.closest('.book-btn');
    if(!btn) return;
    const ride = state.rides.find(r=>r.id===btn.dataset.id);
    openBooking(ride);
  }

  function openBooking(ride){
    const seats = parseInt($('#seats').value)||1;
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    if(!user){alert('Please register/login to book.');openAuth('register');return}
    const bookingPreview = {
      rideId:ride.id,
      studentId:user.id,
      studentName:user.name,
      route:ride.route,
      vehicle:ride.vehicle,
      vehicleNo:ride.vehicleNo,
      driver:ride.driver,
      seats:seats,
      fare: ride.fare*seats,
      date: $('#date').value || new Date().toLocaleDateString(),
      time: ride.arrival
    };
    openPayment(bookingPreview);
  }

  function openPayment(preview){
    const modal = $('#paymentModal');
    $('#payAmount').textContent = '₹'+preview.fare;
    modal.classList.add('show');
    modal.dataset.preview = JSON.stringify(preview);
    // reset coupon state
    modal.dataset.coupon = '';
    modal.dataset.discount = '0';
    $('#paymentCoupon').value = '';
    $('#couponMessage').textContent = '';
    updateWalletUI();
  }

  function onPaymentMethodChange(e){
    const v = e.target.value;
    $('#pmethodFields').querySelectorAll('input').forEach(i=>i.style.display='none');
    // simple toggle
    if(v==='upi'){ $('#upiId').style.display='block'; $('#cardFields').style.display='none'; }
    if(v==='card'){ $('#cardFields').style.display='block'; $('#upiId').style.display='none'; }
    if(v==='netbank'){ $('#upiId').style.display='block'; $('#cardFields').style.display='none'; }
    if(v==='wallet'){ $('#upiId').style.display='none'; $('#cardFields').style.display='none'; }
  }

  function openWallet(){
    const modal = $('#walletModal');
    modal.classList.add('show');
    renderCoupons();
    updateWalletUI();
  }

  function updateWalletUI(){
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    const balEl = $('#walletBalance');
    const walletBtn = $('#walletBtn');
    if(!user){ if(balEl) balEl.textContent='₹0'; if(walletBtn) walletBtn.textContent='Wallet'; return }
    const bal = state.wallets[user.id]||0;
    if(balEl) balEl.textContent = '₹'+bal;
    if(walletBtn) walletBtn.innerHTML = '<span class="wallet-badge">₹'+bal+'</span>';
  }

  function onAddFunds(e){
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    if(!user){alert('Login/Register first');openAuth('register');return}
    const amt = parseFloat($('#addAmount').value)||0;
    if(amt<=0){alert('Enter valid amount');return}
    state.wallets[user.id] = (state.wallets[user.id]||0) + amt;
    localStorage.setItem('cr_wallets', JSON.stringify(state.wallets));
    $('#addAmount').value='';
    updateWalletUI();
    // record transaction
    const tx = { id:'T'+Date.now().toString(36).toUpperCase(), userId:user.id, type:'topup', amount:amt, date:new Date().toISOString(), balance: state.wallets[user.id] };
    state.transactions.push(tx);
    localStorage.setItem('cr_transactions', JSON.stringify(state.transactions));
    renderDashboard();
    alert('Added ₹'+amt+' to wallet (demo)');
  }

  function renderCoupons(){
    const list = $('#couponList');
    list.innerHTML='';
    state.coupons.forEach(c=>{
      const el = document.createElement('div'); el.className='card coupon';
      el.innerHTML = `<strong>${c.code}</strong><div class="muted">${c.desc}</div>`;
      list.appendChild(el);
    });
  }

  function onCreateCoupon(){
    const code = $('#newCouponCode').value.trim().toUpperCase();
    if(!code) return alert('Enter code');
    const c = {code:code,type:'fixed',value:10,desc:'Demo ₹10 off',active:true};
    state.coupons.push(c);
    localStorage.setItem('cr_coupons', JSON.stringify(state.coupons));
    $('#newCouponCode').value='';
    renderCoupons();
    alert('Coupon created (demo): '+code);
  }

  function onApplyCoupon(){
    const code = $('#paymentCoupon').value.trim().toUpperCase();
    const modal = $('#paymentModal');
    const preview = JSON.parse(modal.dataset.preview||'null');
    if(!preview) return alert('No booking selected');
    if(!code) { $('#couponMessage').textContent='Enter coupon code'; return }
    const c = state.coupons.find(x=>x.code===code && x.active);
    if(!c){ $('#couponMessage').textContent='Invalid coupon'; return }
    // calculate discount
    let discount = 0;
    if(c.type==='percent') discount = Math.min(preview.fare * (c.value/100), 50);
    else discount = c.value;
    modal.dataset.coupon = c.code;
    modal.dataset.discount = String(discount);
    const final = preview.fare - discount;
    $('#payAmount').textContent = '₹'+final;
    $('#couponMessage').textContent = `Applied ${c.code}: -₹${discount}`;
  }

  function onPaymentSubmit(e){
    e.preventDefault();
    const modal = $('#paymentModal');
    const preview = JSON.parse(modal.dataset.preview||'null');
    if(!preview){alert('No booking preview found');return}
    // simulate payment processing
    const method = document.querySelector('input[name="pmethod"]:checked').value;
    // basic validation for demo
    if(method==='upi' && !$('#upiId').value){alert('Enter UPI ID');return}
    if(method==='card' && !$('#cardNumber').value){alert('Enter card number');return}
    // compute amount after coupon
    const discount = parseFloat(modal.dataset.discount||'0');
    const amount = (preview.fare || 0) - discount;

    if(method==='wallet'){
      const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
      const bal = state.wallets[user.id]||0;
      if(bal < amount){
        if(!confirm('Insufficient wallet balance. Add funds now?')) return;
        openWallet();
        return;
      }
      // deduct
      state.wallets[user.id] = +(bal - amount).toFixed(2);
      localStorage.setItem('cr_wallets', JSON.stringify(state.wallets));
      updateWalletUI();
      setTimeout(()=>{
        finalizeBooking(preview, { paymentMethod: method, amount: amount, coupon: modal.dataset.coupon || '' });
        // record transaction
        const tx = { id:'T'+Date.now().toString(36).toUpperCase(), userId: user.id, type:'payment', method:method, amount:amount, date:new Date().toISOString(), balance: state.wallets[user.id] };
        state.transactions.push(tx);
        localStorage.setItem('cr_transactions', JSON.stringify(state.transactions));
        modal.classList.remove('show');
        renderDashboard();
        alert('Payment successful (wallet)');
      },600);
      return;
    }

    // succeed for other methods
    setTimeout(()=>{
      finalizeBooking(preview, { paymentMethod: method, amount: amount, coupon: modal.dataset.coupon || '' });
      // record transaction (online)
      const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
      const tx = { id:'T'+Date.now().toString(36).toUpperCase(), userId: user?user.id:null, type:'payment', method:method, amount:amount, date:new Date().toISOString(), balance: state.wallets[user?.id]||0 };
      state.transactions.push(tx);
      localStorage.setItem('cr_transactions', JSON.stringify(state.transactions));
      modal.classList.remove('show');
      renderDashboard();
      alert('Payment successful (demo)');
    },800);
  }

  function finalizeBooking(preview, opts={}){
    const booking = Object.assign({}, preview, { id:'B'+Math.random().toString(36).slice(2,9).toUpperCase() });
    // reduce availability
    const r = state.rides.find(x=>x.id===preview.rideId);
    if(r) r.available -= preview.seats;
    state.bookings.push(booking);
    localStorage.setItem('cr_bookings', JSON.stringify(state.bookings));
    showTicket(booking);
    renderResults(state.rides);
    // if payment was not recorded earlier (edge), record here
    if(opts && opts.paymentMethod){
      const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
      const tx = { id:'T'+Date.now().toString(36).toUpperCase(), userId: user?user.id:null, type:'payment', method:opts.paymentMethod, amount:opts.amount||booking.fare, date:new Date().toISOString(), balance: state.wallets[user?.id]||0, bookingId: booking.id };
      state.transactions.push(tx);
      localStorage.setItem('cr_transactions', JSON.stringify(state.transactions));
    }
    renderDashboard();
  }

  function showTicket(booking){
    const modal = $('#ticketModal');
    const area = $('#ticketArea');
    const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl='+encodeURIComponent(booking.id+'|'+booking.studentName+'|'+booking.vehicleNo);
    area.innerHTML = `
      <div style="padding:1rem;background:white;border-radius:8px;color:#111">
        <h3>Ticket: ${booking.id}</h3>
        <p><strong>${booking.studentName}</strong></p>
        <p>${booking.route}</p>
        <p>Vehicle: ${booking.vehicle} (${booking.vehicleNo})</p>
        <p>Driver: ${booking.driver}</p>
        <p>Seats: ${booking.seats} · Fare: ₹${booking.fare}</p>
        <p>Date: ${booking.date} · Time: ${booking.time}</p>
        <img src="${qrUrl}" alt="qr" />
      </div>
    `;
    modal.classList.add('show');
    $('#printTicket').onclick = ()=>printTicket(booking);
  }

  function printTicket(booking){
    const area = $('#ticketArea');
    const w = window.open('','_blank');
    w.document.write('<html><head><title>Ticket '+ (booking?booking.id:'') +'</title>');
    w.document.write('<meta name="viewport" content="width=device-width,initial-scale=1">');
    w.document.write('<style>body{font-family:Arial;padding:20px}</style></head><body>');
    w.document.write(area.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  }

  function renderDashboard(){
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    if(!user) return;
    const bookings = state.bookings.filter(b=>b.studentId===user.id);
    const upcoming = bookings.length; // demo simplification
    const totalBookings = bookings.length;
    const walletBal = state.wallets[user.id]||0;
    // update modal if open
    $('#dashUpcoming') && ($('#dashUpcoming').textContent = upcoming);
    $('#dashTotalBookings') && ($('#dashTotalBookings').textContent = totalBookings);
    $('#dashWallet') && ($('#dashWallet').textContent = '₹'+walletBal);
    // notifications stub
    $('#dashNotifs') && ($('#dashNotifs').textContent = 0);
    // render transactions with filters and pagination
    renderTransactionList();
  }

  function clearTxFilters(){
    $('#txFilterType').value='all';
    $('#txFilterFrom').value='';
    $('#txFilterTo').value='';
    $('#txFilterSearch').value='';
    state.txPage = 1;
    renderTransactionList();
  }

  function renderTransactionList(){
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    const txList = $('#transactionList');
    if(!user || !txList) return;
    const type = $('#txFilterType')?.value || 'all';
    const from = $('#txFilterFrom')?.value;
    const to = $('#txFilterTo')?.value;
    const search = ($('#txFilterSearch')?.value||'').trim().toLowerCase();

    let list = state.transactions.filter(t=>t.userId===user.id);
    if(type && type!=='all') list = list.filter(t=>t.type===type);
    if(from){ const fromDate = new Date(from); list = list.filter(t=> new Date(t.date) >= fromDate); }
    if(to){ const toDate = new Date(to); toDate.setHours(23,59,59,999); list = list.filter(t=> new Date(t.date) <= toDate); }
    if(search){ list = list.filter(t=> (t.amount+"").includes(search) || (t.bookingId||'').toLowerCase().includes(search) || (t.id||'').toLowerCase().includes(search) ); }

    list = list.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const total = list.length;
    const perPage = state.txPerPage || 5;
    const totalPages = Math.max(1, Math.ceil(total/perPage));
    if(state.txPage > totalPages) state.txPage = totalPages;
    if(state.txPage < 1) state.txPage = 1;
    const start = (state.txPage-1)*perPage;
    const pageItems = list.slice(start, start+perPage);

    txList.innerHTML = '';
    if(pageItems.length===0){ txList.innerHTML = '<div class="muted">No transactions found.</div>'; }
    pageItems.forEach(t=>{
      const el = document.createElement('div'); el.className='transaction';
      const left = document.createElement('div'); left.innerHTML = `<div><strong>${t.type==='topup'? 'Top-up' : 'Payment'}</strong></div><div class="meta">${new Date(t.date).toLocaleString()}</div>`;
      const right = document.createElement('div'); right.innerHTML = `<div>₹${t.amount}</div><div class="meta">Balance: ₹${t.balance|| state.wallets[user.id]||0}</div>`;
      el.appendChild(left); el.appendChild(right);
      el.dataset.txid = t.id;
      el.style.cursor = 'pointer';
      el.addEventListener('click', ()=>openTransactionDetail(t.id));
      txList.appendChild(el);
    });

    // pagination UI
    $('#txPageInfo').textContent = `Page ${state.txPage} / ${totalPages}`;
    $('#txPrevBtn').disabled = state.txPage<=1;
    $('#txNextBtn').disabled = state.txPage>=totalPages;
  }

  function getFilteredTransactions(){
    const user = JSON.parse(localStorage.getItem('cr_currentUser')||'null');
    if(!user) return [];
    const type = $('#txFilterType')?.value || 'all';
    const from = $('#txFilterFrom')?.value;
    const to = $('#txFilterTo')?.value;
    const search = ($('#txFilterSearch')?.value||'').trim().toLowerCase();

    let list = state.transactions.filter(t=>t.userId===user.id);
    if(type && type!=='all') list = list.filter(t=>t.type===type);
    if(from){ const fromDate = new Date(from); list = list.filter(t=> new Date(t.date) >= fromDate); }
    if(to){ const toDate = new Date(to); toDate.setHours(23,59,59,999); list = list.filter(t=> new Date(t.date) <= toDate); }
    if(search){ list = list.filter(t=> (t.amount+"").includes(search) || (t.bookingId||'').toLowerCase().includes(search) || (t.id||'').toLowerCase().includes(search) ); }
    return list.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  function exportTransactionsCSV(){
    const rows = getFilteredTransactions();
    if(rows.length===0) return alert('No transactions to export');
    const headers = ['Transaction ID','Type','Amount','Method','Date','Balance','Booking ID'];
    const csv = [headers.join(',')];
    rows.forEach(r=>{
      const line = [r.id, r.type, r.amount, (r.method||''), new Date(r.date).toISOString(), (r.balance||''), (r.bookingId||'')];
      csv.push(line.map(v=>`"${(''+v).replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([csv.join('\n')], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'campusride-transactions.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function applyDatePreset(preset){
    const today = new Date();
    let from = '';
    let to = '';
    if(preset==='last7'){
      const d = new Date(); d.setDate(d.getDate()-6);
      from = formatDateInput(d);
      to = formatDateInput(today);
    } else if(preset==='thisMonth'){
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      from = formatDateInput(first);
      to = formatDateInput(today);
    } else if(preset==='lastMonth'){
      const first = new Date(today.getFullYear(), today.getMonth()-1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      from = formatDateInput(first);
      to = formatDateInput(last);
    } else if(preset==='all'){
      from=''; to='';
    }
    $('#txFilterFrom').value = from;
    $('#txFilterTo').value = to;
    state.txPage = 1;
    renderTransactionList();
  }

  function formatDateInput(d){
    const yyyy = d.getFullYear();
    const mm = (d.getMonth()+1).toString().padStart(2,'0');
    const dd = d.getDate().toString().padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function openDashboard(){
    const modal = $('#dashboardModal');
    modal.classList.add('show');
    renderDashboard();
  }

  function openTransactionDetail(txId){
    const tx = state.transactions.find(t=>t.id===txId);
    if(!tx) return alert('Transaction not found');
    const area = $('#txDetailArea');
    area.innerHTML = '';
    const wrapper = document.createElement('div'); wrapper.className='receipt';
    wrapper.innerHTML = `
      <h4>Receipt: ${tx.id}</h4>
      <div class="row"><div>Type</div><div>${tx.type}</div></div>
      <div class="row"><div>Amount</div><div>₹${tx.amount}</div></div>
      <div class="row"><div>Method</div><div>${tx.method||'-'}</div></div>
      <div class="row"><div>Date</div><div>${new Date(tx.date).toLocaleString()}</div></div>
      <div class="row"><div>Balance After</div><div>₹${tx.balance||0}</div></div>
    `;
    // if booking present, show booking summary
    if(tx.bookingId){
      const b = state.bookings.find(x=>x.id===tx.bookingId);
      if(b){
        const bookHtml = document.createElement('div');
        bookHtml.innerHTML = `
          <hr />
          <h4>Booking: ${b.id}</h4>
          <div class="row"><div>Student</div><div>${b.studentName}</div></div>
          <div class="row"><div>Route</div><div>${b.route}</div></div>
          <div class="row"><div>Vehicle</div><div>${b.vehicle} (${b.vehicleNo})</div></div>
          <div class="row"><div>Seats</div><div>${b.seats}</div></div>
          <div class="row"><div>Date/Time</div><div>${b.date} ${b.time}</div></div>
          <div style="text-align:center;margin-top:.6rem"><img src="https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=${encodeURIComponent(b.id+'|'+b.studentName)}" alt="qr"/></div>
        `;
        wrapper.appendChild(bookHtml);
      }
    }
    area.appendChild(wrapper);
    $('#txDetailModal').classList.add('show');
    $('#printReceiptBtn').onclick = ()=>printReceipt(tx);
  }

  function printReceipt(tx){
    const area = $('#txDetailArea');
    const w = window.open('','_blank');
    w.document.write('<html><head><title>Receipt '+ tx.id +'</title>');
    w.document.write('<meta name="viewport" content="width=device-width,initial-scale=1">');
    w.document.write('<style>body{font-family:Arial;padding:20px}</style></head><body>');
    w.document.write(area.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  }

  window.addEventListener('load', init);
})();
