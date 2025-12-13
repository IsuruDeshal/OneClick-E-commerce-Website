// Minimal shim for legacy Firebase calls to avoid runtime errors after migration to Supabase
// This intentionally returns stubbed methods and surfaces clear errors so you can migrate logic to Supabase.
window.firebase = window.firebase || {};
(function () {
  if (window.firebase.__shimInstalled) return; window.firebase.__shimInstalled = true;

  // auth() -> object with basic methods used in legacy code
  window.firebase.auth = function () {
    return {
      currentUser: null,
      signInWithEmailAndPassword: function () {
        return Promise.reject(new Error('Firebase auth is removed. Use Supabase auth.'));
      },
      createUserWithEmailAndPassword: function () {
        return Promise.reject(new Error('Firebase auth is removed. Use Supabase auth.'));
      },
      onAuthStateChanged: function () {
        // no-op
        return function () {};
      }
    };
  };

  // firestore() -> minimal stub
  window.firebase.firestore = function () {
    return {
      collection: function () { return { doc: function () { return { get: async () => ({ exists: false }), set: async () => {}, update: async () => {}, delete: async () => {} } } } }
    };
  };

  console.warn('Firebase shim loaded: legacy firebase.* calls will be no-ops and will fail where authentication is required. Migrate to Supabase.');
})();

