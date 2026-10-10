# Putting SafarCo online: step-by-step

This guide takes you from nothing to a live SafarCo website that anyone can open on their phone. You don't need to write or change any code.

**Time:** about 45 minutes. **Cost:** free. (The optional Google Play listing in step 8 costs a one-time US$25.)

You will create four free accounts:

| Account | What it's for |
|---|---|
| GitHub | Stores the app's code |
| Vercel | Runs the website |
| OpenRouteService | Road routes and distances |
| Geoapify | Place search, sights and places to stay |

Website screens change from time to time. If a button has a slightly different name, look for the closest match.

---

## Step 1: Create a GitHub account

1. Go to **github.com** and click **Sign up**.
2. Enter your email, a password and a username, then verify your email.

## Step 2: Create an empty place for the code (a "repository")

1. On GitHub, click the **+** at the top right, then **New repository**.
2. **Repository name:** `safarco`.
3. Choose **Public** or **Private**. Either works with Vercel's free plan.
4. Leave everything else unticked (no README, no .gitignore, no licence).
5. Click **Create repository**.
6. **Send me the repository address**, for example `github.com/your-name/safarco`. I'll upload the code into it for you.
   - If a message asks you to give Claude access to the repository, approve it.
   - Prefer to upload it yourself? Install **GitHub Desktop** (desktop.github.com), choose **Add an existing repository**, select this project's folder, then click **Publish repository**.

## Step 3: Get an OpenRouteService key (routes)

1. Go to **openrouteservice.org** and click **Sign up**. Confirm your email.
2. Log in and open the **Dashboard**.
3. Under **Request a token**, choose the **Standard** (free) plan, give it a name such as `safarco`, and click **Create Token**.
4. Copy the long key it shows and save it in a note. You'll paste it in step 5.

The free plan allows about 2,000 routes a day. SafarCo remembers each route for a week, so that's plenty for many users.

## Step 4: Get a Geoapify key (places and hotels)

1. Go to **myprojects.geoapify.com** and sign up. The free plan needs no card.
2. Click **Create a project** and name it `safarco`.
3. The project page shows an **API key**. Copy it into your note.

The free plan allows 3,000 "credits" a day. Each search or place list uses one or two, and SafarCo remembers answers for a week or more.

## Step 5: Put the website online with Vercel

1. Go to **vercel.com**, click **Sign Up**, choose **Hobby**, then **Continue with GitHub**. Approve the access request.
2. Click **Add New… → Project**.
3. Find **safarco** in the list and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and allow access to the repository.
4. On the **Configure Project** screen:
   - **Root Directory:** click **Edit**, choose the **app** folder and click **Continue**. *This step matters: the app lives in the `app` folder.*
   - **Framework Preset:** it should say **Vite**. Leave the build settings as they are.
   - Open **Environment Variables** and add two entries (Name, then Value), clicking **Add** after each:
     - `ORS_API_KEY` = your OpenRouteService key
     - `GEOAPIFY_API_KEY` = your Geoapify key
5. Click **Deploy** and wait a minute or two.
6. When it says **Congratulations**, click the preview to open your site. Your address looks like `safarco-xxxx.vercel.app`. To change it, go to **Settings → Domains**.

Your keys are now stored only inside Vercel. They never reach visitors' phones.

## Step 6: Check that everything works

Open your new address on your phone and go through the questions, choosing **Lahore → Skardu**. On the trip screen, check:

- [ ] **Dates & season** has a green tick: "Distance checked with OpenRouteService". *If not, the ORS key is missing or wrong.*
- [ ] **About Skardu** shows a short guide from Wikivoyage.
- [ ] **Weather in Skardu** shows daily temperatures.
- [ ] **Where to stay in Skardu** lists real places with **Check prices** buttons. *If you only see the three sample hotels, the Geoapify key is missing or wrong.*
- [ ] **Projected budget** shows US dollars next to rupees.
- [ ] The **Map** tab shows a real map with your route.

If you change a key later: in Vercel open **Settings → Environment Variables**, edit it, then go to **Deployments**, click the **⋯** on the latest one and choose **Redeploy**. Keys only take effect after a redeploy.

## Step 7: Install it on a phone

- **iPhone:** open the site in **Safari**, tap the **Share** button, then **Add to Home Screen**.
- **Android:** open the site in **Chrome**, tap the **⋮** menu, then **Install app** (or **Add to Home screen**).

It then opens full screen like a normal app. On the **Offline** tab, **Download for offline** saves the route's map for areas with no signal.

Share the link anywhere: WhatsApp, Facebook, a QR code. People can use it straight away in their browser.

## Step 8 (optional): List it on Google Play

A web app like SafarCo can be wrapped as an Android app without new code. Google charges a **one-time US$25** to open a developer account.

1. Create a **Google Play Console** account at **play.google.com/console** and pay the fee. Identity checks can take a few days.
2. Go to **pwabuilder.com**, paste your Vercel address and click **Start**. Then choose **Package for stores → Android** and download the package.
3. The package contains a file called `assetlinks.json`. **Send it to me** and I'll add it to the app, so Android trusts that the store app and your website belong together.
4. In Play Console, create the app, upload the `.aab` file from the package, and fill in the store listing (screenshots, description, privacy policy). PWABuilder's download includes step-by-step notes.

**Apple's App Store** needs a US$99 a year developer account and is stricter about web-based apps. Adding to the home screen (step 7) is the free way for iPhone users.

## Keeping it free

| Limit | What happens if you hit it |
|---|---|
| Vercel Hobby plan: for personal, non-commercial projects, with generous monthly traffic | Vercel will ask you to upgrade. Fine as long as SafarCo stays free and ad-free. |
| Open-Meteo weather: free for non-commercial use | Same condition as above. |
| OpenRouteService: ~2,000 routes a day | New routes fall back to SafarCo's built-in road table for the rest of the day. |
| Geoapify: 3,000 credits a day | Searches fall back to the built-in city list; hotels fall back to sample picks. |

To see usage: the **Usage** tab on Vercel, the **Dashboard** on OpenRouteService, and the project page on Geoapify.

If you ever add ads or paid features, tell me first. Vercel and Open-Meteo would then need paid plans or alternatives.

## Making changes later

Every time new code reaches the `main` branch on GitHub, Vercel rebuilds and publishes the site automatically, usually within two minutes. Ask me for changes and I'll push them. You can watch progress on Vercel's **Deployments** tab.

## If something goes wrong

| Problem | Fix |
|---|---|
| Vercel build fails with "No package.json found" | **Settings → Build and Deployment → Root Directory** must be `app`. Then redeploy. |
| No green "Distance checked" tick | Check `ORS_API_KEY` in **Settings → Environment Variables** (no spaces before or after), then redeploy. |
| No real hotels, or city search finds only big cities | Check `GEOAPIFY_API_KEY` the same way. |
| The phone still shows an old version | Close the app completely and open it again. It updates on the next launch. |
| Weather says "unavailable" | Open-Meteo is briefly down; it comes back by itself. |
