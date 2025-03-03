const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// Ensure results directory exists
const resultsDir = path.join(__dirname, 'results');
fs.ensureDirSync(resultsDir);

// Function to scrape DU Bulletin for upper-division CS courses with no prerequisites
async function scrapeDUBulletin() {
    const bulletinUrl = 'https://bulletin.du.edu'; // Replace with actual URL
    const courses = [];

    try {
        const { data } = await axios.get(bulletinUrl);
        const $ = cheerio.load(data);

        $('.courseblock').each((index, element) => {
            const courseCode = $(element).find('.courseblocktitle strong').text().trim();
            const title = $(element).find('.courseblocktitle').text().replace(courseCode, '').trim();
            const prereqText = $(element).find('.courseblockextra').text();

            if (courseCode.startsWith('COMP-3') && !prereqText.includes('Prerequisite')) {
                courses.push({ course: courseCode, title });
            }
        });

        fs.writeJsonSync(path.join(resultsDir, 'bulletin.json'), { courses }, { spaces: 2 });
        console.log('✅ DU Bulletin data saved successfully.');
    } catch (error) {
        console.error('❌ Error scraping DU Bulletin:', error.message);
    }
}

// Function to scrape DU Athletics site for upcoming events
async function scrapeDUAthletics() {
    const athleticsUrl = 'https://denverpioneers.com/index.aspx'; // Replace with actual URL
    const events = [];

    try {
        const { data } = await axios.get(athleticsUrl);
        const $ = cheerio.load(data);

        $('.carousel-item').each((index, element) => {
            const duTeam = $(element).find('.team-name').text().trim();
            const opponent = $(element).find('.opponent-name').text().trim();
            const date = $(element).find('.event-date').text().trim();

            if (duTeam && opponent && date) {
                events.push({ duTeam, opponent, date });
            }
        });

        fs.writeJsonSync(path.join(resultsDir, 'athletic_events.json'), { events }, { spaces: 2 });
        console.log('✅ DU Athletics events data saved successfully.');
    } catch (error) {
        console.error('❌ Error scraping DU Athletics:', error.message);
    }
}

// Function to scrape DU Main Calendar for 2025 events
async function scrapeDUCalendar() {
    const calendarUrl = 'https://www.du.edu/calendar'; // Replace with actual URL
    const events = [];

    try {
        const { data } = await axios.get(calendarUrl);
        const $ = cheerio.load(data);

        // Collect event details
        const eventItems = [];
        $('.event-item').each((index, element) => {
            let eventUrl = $(element).find('a.event-link').attr('href');
            if (eventUrl && !eventUrl.startsWith('http')) {
                eventUrl = 'https://www.du.edu/calendar' + eventUrl; // Fix relative links
            }

            eventItems.push({
                title: $(element).find('.event-title').text().trim(),
                date: $(element).find('.event-date').text().trim(),
                time: $(element).find('.event-time').text().trim() || null,
                eventUrl
            });

            console.log(`📅 Found Event: ${eventItems[eventItems.length - 1].title} | ${eventItems[eventItems.length - 1].date} | Link: ${eventUrl}`);
        });

        // Loop through events and fetch descriptions asynchronously
        for (const event of eventItems) {
            if (event.eventUrl) {
                try {
                    const { data: eventPage } = await axios.get(event.eventUrl);
                    const $$ = cheerio.load(eventPage);
                    event.description = $$('.event-description').text().trim();
                } catch (error) {
                    console.error(`⚠️ Error fetching event description for ${event.title}:`, error.message);
                }
            }
            delete event.eventUrl; // Remove URL from final JSON output
            events.push(event);
        }

        fs.writeJsonSync(path.join(resultsDir, 'calendar_events.json'), { events }, { spaces: 2 });
        console.log('✅ DU Calendar events data saved successfully.');
    } catch (error) {
        console.error('❌ Error scraping DU Calendar:', error.message);
    }
}

// Async function to run all scraping tasks
async function runScrapingTasks() {
    await scrapeDUBulletin();
    await scrapeDUAthletics();
    await scrapeDUCalendar();
}

// Execute the scraping tasks
runScrapingTasks();
