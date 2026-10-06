package tw.ecogame.mario;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

public class MainActivity extends Activity {
    private WebView game;
    private static final String HOST = "appassets.androidplatform.net";

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        game = new WebView(this);
        game.setBackgroundColor(0xffd5e9c9);
        game.getSettings().setJavaScriptEnabled(true);
        game.getSettings().setDomStorageEnabled(true);
        game.getSettings().setAllowFileAccess(false);
        game.getSettings().setAllowContentAccess(false);
        game.setWebChromeClient(new WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if (!HOST.equals(request.getUrl().getHost()) || path == null || !path.startsWith("/assets/") || path.contains("..")) return missing();
                String file = path.substring(8);
                String mime = file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".webmanifest") ? "application/manifest+json" : file.endsWith(".png") ? "image/png" : file.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream";
                try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(file)); }
                catch (IOException e) { return missing(); }
            }
            private WebResourceResponse missing() {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        setContentView(game);
        immersive();
        game.loadUrl("https://" + HOST + "/assets/index.html");
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) immersive(); }
    @Override protected void onPause() { game.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (game != null) game.onResume(); }
    @Override public void onBackPressed() {
        game.evaluateJavascript("(function(){var r=document.getElementById('rulesView');if(r&&!r.classList.contains('hidden')){document.getElementById('backToHomeBtn').click();return true;}var g=document.getElementById('gameView');if(g&&!g.classList.contains('hidden')){document.getElementById('quickRestartBtn').click();return true;}return false;})()", result -> { if (!"true".equals(result)) finish(); });
    }
    @Override protected void onDestroy() { game.destroy(); super.onDestroy(); }
}
