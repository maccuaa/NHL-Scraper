## Overview

The aim of this project was to collect data that could be used for a school database assignment

## Details

Node server that scrapes the [nhl.com](NHL) website for 
  - Teams
  - Players
  - Rosters
  - Player stats
  - Match results
  
The information is then used to generate an SQLite script that can be run to
create a database with all the information.

**Note that this probably won't work anymore since it was highly dependant on 
the HTML structure of the NHL website so any changes made to the website will
break this program**

## Disclaimer

Before using this project please consult the 
[NHL's Terms of Service](http://www.nhl.com/ice/page.htm?id=26389), specifically
Section 2.2
  > you may not:  
  > Engage in unauthorized spidering, scraping, or harvesting of content or
  > information, or use any other unauthorized automated means to compile
  > information;
