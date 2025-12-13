(function(){
  const { fmtCurrency } = window.AdminUtils;
  const { listOrders, listProducts } = window.AdminAPI;
  async function init(){
    // KPIs
    const [orders, products] = await Promise.all([listOrders(), listProducts()]);
    const revenue = orders.reduce((s,o)=> s + Number(o.total||0), 0);
  document.getElementById('kpiOrders').textContent = orders.length;
  document.getElementById('kpiProducts').textContent = products.length;
    document.getElementById('kpiRevenue').textContent = fmtCurrency(revenue);
    // Users KPI via users collection
    const resp = await (window.Firebase?.db).collection('users').get();
  document.getElementById('kpiUsers').textContent = resp.size;
  const cOrders = document.getElementById('countOrders'); if(cOrders) cOrders.textContent = orders.length;
  const cProducts = document.getElementById('countProducts'); if(cProducts) cProducts.textContent = products.length;
  const cUsers = document.getElementById('countUsers'); if(cUsers) cUsers.textContent = resp.size;

  const recent = orders.slice(0, 6);
    const table = document.getElementById('recentOrders');
    table.innerHTML = `<tr><th>Order</th><th>Date</th><th>User</th><th>Total</th><th>Status</th></tr>` +
      recent.map(o=> `<tr>
        <td><a href="/admin/order-details.html?id=${o.id}">${o.id}</a></td>
        <td>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : '-'}</td>
        <td>${o.userEmail||o.userId||'-'}</td>
        <td>${fmtCurrency(o.total)}</td>
        <td><span class="badge">${o.status||'new'}</span></td>
      </tr>`).join('');

    // Build 14-day series
    const days = [...Array(14)].map((_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-(13-i)); d.setHours(0,0,0,0); return d;
    });
    const counts = days.map(d=> 0);
    orders.forEach(o=>{
      const ts = o.createdAt?.toDate? o.createdAt.toDate() : null;
      if(!ts) return;
      ts.setHours(0,0,0,0);
      const idx = days.findIndex(d=> d.getTime()===ts.getTime());
      if(idx>=0) counts[idx] += 1;
    });
    const ctx = document.getElementById('ordersChart');
    if(ctx && window.Chart){
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: days.map(d=> d.toLocaleDateString()),
          datasets: [{ label: 'Orders', data: counts, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.2)', tension:.2 }]
        },
        options: { plugins:{ legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }
      });
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
