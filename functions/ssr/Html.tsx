
import React, { ReactNode } from 'react';

interface HtmlProps {
    children: ReactNode;
    initialData: any;
    seoTags: ReactNode;
}

export const HtmlTemplate: React.FC<HtmlProps> = ({ children, initialData, seoTags }) => {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                {seoTags}
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
                <style>{`
                    body { background-color: #18191A; color: #E4E6EB; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; }
                    ::-webkit-scrollbar { display: none; }
                    * { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
            </head>
            <body>
                <div id="root">{children}</div>
                <script
                    id="initial-data"
                    type="application/json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(initialData).replace(/</g, '\\u003c'),
                    }}
                />
                <script type="module" src="/index.tsx"></script>
            </body>
        </html>
    );
};
