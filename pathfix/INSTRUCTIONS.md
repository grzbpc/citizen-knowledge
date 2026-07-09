# Path prefix fix: instructions

This fixes the missing styling and the 404 errors on links. Both were caused by the same
problem: GitHub Pages serves your site at

    https://grzbpc.github.io/citizen-knowledge/

not at the root of the domain, but the site's files were built assuming they'd live at the
root. These five files tell the site to correctly prepend /citizen-knowledge/ to every
internal link and every asset (like the stylesheet).

## What to do

Copy each file below into your project folder, **overwriting the existing file at the same
path**. All five keep their exact original names and folder locations, so this is a
straight copy-and-replace, no renaming needed.

Your project folder is: C:\Users\GRZ\citizen-knowledge

Copy these files into place:

- .eleventy.js                    -> C:\Users\GRZ\citizen-knowledge\.eleventy.js
- src\index.njk                   -> C:\Users\GRZ\citizen-knowledge\src\index.njk
- src\_includes\post.njk          -> C:\Users\GRZ\citizen-knowledge\src\_includes\post.njk
- src\about\index.njk             -> C:\Users\GRZ\citizen-knowledge\src\about\index.njk
- src\chapters\index.njk          -> C:\Users\GRZ\citizen-knowledge\src\chapters\index.njk

When Windows asks whether to replace the existing file, say yes for all five.

## Then, in Command Prompt

Navigate to the project folder if you're not already there:

    cd C:\Users\GRZ\citizen-knowledge

Test it locally first (optional but recommended):

    npm run start

Note: because of the path prefix, the local preview now lives at
http://localhost:8080/citizen-knowledge/ instead of the plain localhost:8080 address.
Open that exact address (with /citizen-knowledge/ on the end) to preview it correctly.
Press Ctrl+C to stop the server when done.

Then push the fix to GitHub:

    git add .
    git commit -m "Fix path prefix for GitHub Pages subpath"
    git push

The GitHub Action will rebuild and redeploy automatically, usually within a minute or two.
Refresh https://grzbpc.github.io/citizen-knowledge/ after that and the styling and links
should both be working correctly.
