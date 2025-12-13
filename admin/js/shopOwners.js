(function(){
  const { listUsers, setUserRole } = window.AdminAPI;
  async function init(){
    const t = document.getElementById('ownersTable'); if(!t) return;
    const users = await listUsers();
    t.innerHTML = '<tr><th>Email</th><th>Role</th><th></th></tr>' + users.map(u=> `<tr>
      <td>${u.email}</td>
      <td>${u.role||'user'}</td>
      <td>
        <button class="btn" data-admin="${u.id}">Make admin</button>
        <button class="btn" data-owner="${u.id}">Make shopOwner</button>
        <button class="btn" data-user="${u.id}">Make user</button>
      </td>
    </tr>`).join('');
    t.addEventListener('click', async (e)=>{
      const uid = e.target?.dataset?.admin||e.target?.dataset?.owner||e.target?.dataset?.user; if(!uid) return;
      const role = e.target.dataset.admin? 'admin' : e.target.dataset.owner? 'shopOwner' : 'user';
      await setUserRole(uid, role); alert('Role updated'); location.reload();
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
