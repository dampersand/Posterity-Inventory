This is a posterity project.  As with all of my posterity projects, it was built for a previous (open source) employer.  I was given permission by my supervisor to post this for portfolio and learning purposes.  If you represent the employer in question and the stance has changed, please contact me to have this taken down!

Because of its posterity status, parts of the code have been redacted - sometimes heavily.  It is very unlikely this will run out of the box.

This project was for an Elasticsearch and web-based inventory system.  This was my first foray into javascript and php beyond simple home/hobbyist scripts.  The system was originally meant to be a very simple inventory replacement, but as I maintained the project, more and more requests to do more and more things came in.  As a result, the system was completely rewritten twice.  Nonetheless, much of the code was legacy at pretty much all times!  That means that you will find some scary stuff - currying functions, for instance, a practice I have since learned not to do.  There is also some fairly suboptimal code factoring.  However, the system continued to function beautifully and received more and more feature requests.  I singlehandedly supported this system for three years, and it is still in place today (as far as I know).

The system included an inventory and history system, an executive reporting system, an inventory auditing system, a frontend to be used with a tablet and barcode scanner, multiple scripts to clean up the database (which was based on Elasticsearch), a homebuilt token authentication system, a datacenter HUD that scraped info from many sources, etc.

You will find HTML, CSS, PHP, javascript with jquery, and python in this project.

Treat this project as a fossil record.  A lot of learning came from this project!
