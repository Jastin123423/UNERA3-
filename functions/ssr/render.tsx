
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Context } from 'hono';
import App from '../../App';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HtmlTemplate } from './Html';
import { Seo } from './Seo';

interface SeoInfo {
    type: 'home' | 'profile' | 'post' | 'error';
    data?: any;
}

export async function render(c: Context, initialData: any, seoInfo: SeoInfo) {
    
    const appComponent = (
        <React.StrictMode>
            <LanguageProvider>
                <App initialData={initialData} initialPath={new URL(c.req.url).pathname} />
            </LanguageProvider>
        </React.StrictMode>
    );
    
    const appHtml = renderToString(appComponent);
    const seoTags = <Seo type={seoInfo.type} data={seoInfo.data} />;

    const finalHtml = renderToString(
        <HtmlTemplate initialData={initialData} seoTags={seoTags}>
            {appHtml}
        </HtmlTemplate>
    );
    
    // We need to manually reconstruct the full HTML document because renderToString only returns the inner content.
    // The '!DOCTYPE html' is important for standards compliance.
    return `<!DOCTYPE html>${finalHtml}`;
}
