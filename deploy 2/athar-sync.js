(function(){
  function connect(cfg, session, onValue, onConn){
    var sb = window.supabase.createClient(cfg.url, cfg.key, { realtime: { params: { eventsPerSecond: 30 } } });
    var pre = session + '/', rows = new Map(), t = null, T = 'athar_kv';
    function emit(){
      if (t) return;
      t = setTimeout(function(){
        t = null; var tree = {};
        rows.forEach(function(val, path){
          var p = path.slice(pre.length).split('/'), o = tree;
          for (var i = 0; i < p.length - 1; i++){ if (typeof o[p[i]] !== 'object' || o[p[i]] === null) o[p[i]] = {}; o = o[p[i]]; }
          o[p[p.length - 1]] = val;
        });
        onValue(tree);
      }, 30);
    }
    function chk(r){ if (r && r.error) console.error('athar sync', r.error); }
    function load(){
      return sb.from(T).select('path,val').like('path', pre + '%').then(function(r){
        if (r.error) { console.error('athar load', r.error); return; }
        rows.clear(); (r.data || []).forEach(function(x){ rows.set(x.path, x.val); }); emit();
      });
    }
    sb.channel('athar-' + session)
      .on('postgres_changes', { event: '*', schema: 'public', table: T }, function(p){
        var path = (p.new && p.new.path) || (p.old && p.old.path);
        if (!path || path.indexOf(pre) !== 0) return;
        if (p.eventType === 'DELETE') rows.delete(path); else rows.set(path, p.new.val);
        emit();
      })
      .subscribe(function(st){ onConn(st === 'SUBSCRIBED'); if (st === 'SUBSCRIBED') load(); });
    load();
    setInterval(load, 20000);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) load(); });
    function setPath(path, val){
      var full = pre + path;
      if (val === null || val === undefined){ rows.delete(full); emit(); sb.from(T).delete().eq('path', full).then(chk); }
      else { rows.set(full, val); emit(); sb.from(T).upsert({ path: full, val: val, updated_at: new Date().toISOString() }).then(chk); }
    }
    return {
      child: function(path){ return { set: function(v){ setPath(path, v); } }; },
      update: function(obj){ Object.keys(obj).forEach(function(k){ setPath(k, obj[k]); }); },
      remove: function(){ rows.clear(); emit(); sb.from(T).delete().like('path', pre + '%').then(chk); }
    };
  }
  window.AtharSync = { connect: connect };
})();
