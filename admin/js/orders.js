(function(){
  const { getParams, fmtCurrency } = window.AdminUtils;
  const { listOrders, getOrder, updateOrderStatus } = window.AdminAPI;

  function render(t, orders){
    t.innerHTML = '<tr><th>ID</th><th>Date</th><th>User</th><th>Total</th><th>Status</th><th></th></tr>' +
      orders.map(o=> `<tr>
        <td><a href="/admin/order-details.html?id=${o.id}">${o.id}</a></td>
        <td>${o.createdAt?.toDate? o.createdAt.toDate().toLocaleString(): '-'}</td>
        <td>${o.userEmail||o.userId||'-'}</td>
        <td>${fmtCurrency(o.total)}</td>
        <td><span class="badge">${o.status||'new'}</span></td>
        <td>${(o.status||'').toLowerCase()==='shipped' ? '' : `<button class="btn" data-ship="${o.id}">Mark as Shipped</button>`}</td>
      </tr>`).join('');
    t.addEventListener('click', async (e)=>{
      const id = e.target?.dataset?.ship; if(!id) return;
      await updateOrderStatus(id, 'Shipped');
      // Update UI: replace button with status
      const row = e.target.closest('tr');
      if(row){ row.querySelector('.badge').textContent = 'Shipped'; e.target.remove(); }
    }, { once: true });
  }
  async function initList(){
    const t = document.getElementById('ordersTable'); if(!t) return;
    const orders = await listOrders();
    render(t, orders);
    const search = document.getElementById('orderSearch');
    if(search){
      search.addEventListener('input', ()=>{
        const q = search.value.toLowerCase();
        const filtered = orders.filter(o=>
          String(o.id).toLowerCase().includes(q) ||
          String(o.userEmail||'').toLowerCase().includes(q) ||
          String(o.status||'').toLowerCase().includes(q)
        );
        render(t, filtered);
      });
    }
  }

  async function initDetails(){
    const root = document.getElementById('orderRoot'); if(!root) return;
    const { id } = getParams(); if(!id){ root.textContent='Missing id'; return; }
    const o = await getOrder(id); if(!o){ root.textContent='Not found'; return; }
    const items = (o.items||[]).map(it=> `<div class="row" style="justify-content:space-between"><span>${it.name} × ${it.qty}</span><span>${fmtCurrency(it.price*it.qty)}</span></div>`).join('');
    root.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between"><strong>Order ${o.id}</strong><span class="badge">${o.status||'new'}</span></div>
        <div class="note">${o.createdAt?.toDate? o.createdAt.toDate().toLocaleString(): '-'}</div>
        <div style="margin-top:10px">${items || '<div class="note">No items</div>'}</div>
        <div class="row" style="justify-content:space-between;margin-top:10px"><strong>Total</strong><strong>${fmtCurrency(o.total)}</strong></div>
        <div class="note" style="margin-top:14px">Ship to: ${o.address?.fullName||'-'}, ${o.address?.line1||''} ${o.address?.line2||''}, ${o.address?.city||''}, ${o.address?.postal||''}, ${o.address?.country||''}</div>
      </div>`;
  }

  document.addEventListener('DOMContentLoaded', ()=>{ initList(); initDetails(); });
})();
