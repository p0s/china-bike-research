// Drafts are rendered only here, into a separate ignored directory. Production
// builds have no environment-variable switch that can include future articles.
import fs from 'node:fs';
import path from 'node:path';
import {loadPosts,renderPost,renderBlogIndex,validatePostReferences} from '../src/lib/posts.mjs';
import {loadDataset,joinProducts,joinCatalogCandidates} from '../src/lib/data.mjs';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'.research/blog-series-preview');
const data=loadDataset(),products=joinProducts(data),posts=loadPosts(root);
validatePostReferences(posts,data,products);
const ctx={data,products,catalogCandidates:joinCatalogCandidates(data),posts,base:'',siteUrl:'https://preview.invalid',repositoryUrl:'https://github.com/p0s/china-bike-research',siteLastmod:data.meta.snapshot_date};
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
for(const locale of ['en','zh-Hans']) {
 const prefix=locale==='en'?'':'zh/';
 const write=(route,html)=>{
  const target=path.join(output,prefix,route,'index.html');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,html.replace('index,follow,max-image-preview:large','noindex,nofollow'));
 };
 write('blog',renderBlogIndex({...ctx,locale},posts));
 for(const post of posts)write('blog/'+post.slug,renderPost({...ctx,locale},post,posts));
}
console.log('Draft preview only: '+output);
