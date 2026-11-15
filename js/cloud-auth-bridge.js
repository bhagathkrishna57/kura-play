// ==============================================================
// KURA CYBER-ARCADE // GOOGLE SIGN-IN BRIDGE (LOVABLE CLOUD)
// Google is the only sign-in method. The page hosting the arcade
// exposes window.KuraCloudAuth; this file adapts it to the
// window.KuraFirebase interface the rest of the arcade already uses.
// ==============================================================
(function () {
    function getHost() {
        try {
            return (window.parent && window.parent !== window && window.parent.KuraCloudAuth) || window.KuraCloudAuth || null;
        } catch (e) {
            return null;
        }
    }

    function waitForHost(timeoutMs) {
        return new Promise(function (resolve) {
            var host = getHost();
            if (host) return resolve(host);
            var started = Date.now();
            var timer = setInterval(function () {
                host = getHost();
                if (host || Date.now() - started > timeoutMs) {
                    clearInterval(timer);
                    resolve(host);
                }
            }, 100);
        });
    }

    async function signInWithGoogle() {
        var host = await waitForHost(5000);
        if (!host) return { success: false, message: 'Google sign-in is unavailable. Open the arcade from its main page.' };
        try {
            return await host.signInWithGoogle();
        } catch (err) {
            return { success: false, message: (err && err.message) || 'Google sign-in failed.' };
        }
    }

    async function signOutUser() {
        var host = await waitForHost(5000);
        if (!host) return { success: false };
        return host.signOut();
    }

    function onAuthStateChanged(callback) {
        var unsubscribe = function () {};
        waitForHost(10000).then(function (host) {
            if (!host) return callback(null);
            unsubscribe = host.onAuthStateChanged(callback);
        });
        return function () { unsubscribe(); };
    }

    window.KuraFirebase = {
        signInWithGoogle: signInWithGoogle,
        signOutUser: signOutUser,
        signOut: signOutUser,
        onAuthStateChanged: onAuthStateChanged,
        trackEvent: function () {},
        isReady: true
    };

    window.dispatchEvent(new CustomEvent('kura-firebase-ready', { detail: window.KuraFirebase }));
})();
