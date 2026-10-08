import React, { useEffect } from 'react';

const DEFAULT_TITLE = 'GroupSpend - Shared Expense Management';
const DEFAULT_DESCRIPTION = 'GroupSpend Web - Split expenses, track shared balances, and calculate minimal debt settlements for students, roommates, and groups.';
const SITE_URL = 'https://groupspend.vercel.app';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  type = 'website'
}) {
  const fullTitle = title ? `${title} | GroupSpend` : DEFAULT_TITLE;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  useEffect(() => {
    // Document title
    document.title = fullTitle;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Open Graph Title & Description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = fullTitle;

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = description;

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = canonicalUrl;

    // Twitter Cards
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.content = fullTitle;

    let twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.content = description;
  }, [fullTitle, description, canonicalUrl]);

  return null;
}
