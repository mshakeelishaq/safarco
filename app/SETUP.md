# Putting SafarCo online: step-by-step

This guide takes you from nothing to a live SafarCo website that anyone can open on their phone. You don't need to write or change any code.

**Time:** about 90 minutes in total (steps 1–6 get the site online; 7–11 add accounts, prices and visitor counts). **Cost:** free. (The optional Google Play listing in step 8 costs a one-time US$25.)

You will create five free accounts, plus a Google sign-in setup:

| Account | What it's for |
|---|---|
| GitHub | Stores the app's code |
| Vercel | Runs the website |
| OpenRouteService | Road routes and distances |
| Geoapify | Place search, sights and places to stay |
| Supabase | Saves trips to people's accounts, your price list and feedback |
| Google Cloud | Lets people sign in with Google (free, no card needed) |

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

## Step 7: Set up Supabase (saved trips, price list, feedback)

Without this step the app still works: trips save on each phone only, and prices use the built-in list.

1. Go to **supabase.com**, click **Start your project** and sign in with GitHub.
2. Click **New project**. Name it `safarco`, create a strong database password (save it in your note), and choose the region **closest to Pakistan** (for example Mumbai or Singapore). Click **Create new project** and wait about 2 minutes.
3. In the left menu open **SQL Editor → New query**. Open the file `app/supabase/schema.sql` from your GitHub repository, copy all of it, paste it in, and click **Run**. It should say "Success".
4. Make yourself the admin. In a new query, paste this with **your Google email**, then click **Run**:
   `insert into public.admins (email) values ('your.name@gmail.com');`
5. Open **Project Settings → API** (sometimes called **Data API**). Copy the **Project URL** and the **anon public** key into your note.

The anon key is meant to be public: it's built into the website. The database rules from step 3 make sure people can only see their own trips, and only you can change prices.

## Step 8: Turn on "Sign in with Google"

**Part A: Google Cloud**
1. Go to **console.cloud.google.com** and sign in. Create a project named `SafarCo` (top bar → project picker → **New project**).
2. Open **APIs & Services → OAuth consent screen** (it may be called **Google Auth Platform → Branding**). Choose **External**, set:
   - **App name:** SafarCo
   - **Support email:** your email
   - **Authorised domain:** `vercel.app` (or your own domain later)
   - **Privacy policy link:** `https://<your-site>/privacy`
   - **Terms link:** `https://<your-site>/terms`
3. Under **Audience**, click **Publish app**. *Important: if it stays in "Testing", only the test users you list can sign in.*
4. Open **Credentials → Create credentials → OAuth client ID**. Choose **Web application**.
5. In **Supabase → Authentication → Sign In / Providers → Google**, copy the **Callback URL** it shows.
6. Back in Google, paste that address under **Authorised redirect URIs** and click **Create**. Copy the **Client ID** and **Client secret**.

**Part B: Supabase**
1. In **Authentication → Sign In / Providers → Google**, switch it on and paste the Client ID and Client secret. Click **Save**.
2. In **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel address, for example `https://safarco-xxxx.vercel.app`.
   - Under **Redirect URLs**, add `https://safarco-xxxx.vercel.app/**`.

**Part C: Vercel**
1. In **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
   - `VITE_CONTACT_EMAIL` = an email people can contact (shown on the Privacy page)
2. Redeploy (**Deployments → ⋯ → Redeploy**).

**Check it:**
1. Plan a trip and tap the **bookmark** (Save) button. The app should offer **Continue with Google**.
2. Sign in. Your trip should then show **In your account** under **My trips**.

## Step 9: Check and enter real prices (the admin page)

1. Open `https://<your-site>/admin` and sign in with the Google email you made admin in step 7.
2. For each section, check the current prices from the source shown, type them in, and set **Checked on**. Fuel and tolls take 5 minutes:
   - **Fuel:** ogra.org.pk publishes petrol and diesel prices on the 1st and 16th of each month.
   - **Tolls:** nha.gov.pk publishes the motorway toll list.
   - **Hotels, hire, coaches, flights and jeeps:** check a few typical prices on Booking.com, PIA or Airblue, and with local operators (a WhatsApp message to a rent-a-car office or jeep stand in Skardu or Hunza works well).
3. Click **Save price list**. Every visitor then sees your prices with the date you checked them. Sections you haven't checked say **not checked yet**, so the app is always honest about it.
4. **Road alerts:** add one when a pass or road closes (for example "Babusar Pass closed: snow"). Under **Places**, pick the pass, town or destination it affects, and it shows only on trips that go there, until the date you choose. With no places it shows on every trip.
5. **Trusted hotels and drivers:** tap **+ Add hotel** or **+ Add driver**, fill in the name, place, price and WhatsApp number, then **Save price list**. Hotels show first, marked "Recommended by SafarCo", on every night spent in that place; drivers show on every trip that passes their place. Untick **Show in app** to hide one without deleting it. Always ask people before you publish their number.
6. **Reviews of your hotels and drivers:** once, paste the file `app/supabase/reviews.sql` from your GitHub repository into Supabase → **SQL Editor** → **New query** → **Run** (it should say "Success"). Travellers who are signed in can tap **Rate** on a recommended hotel from the morning after their night there (and on a driver after the day they need them), and after the trip a **How was your trip?** card asks about each one. If you ran `reviews.sql` before, run it again once: it adds the stay date. New reviews wait under **Reviews of hotels and drivers** on /admin: tap **Approve** to show one, **Hide** to keep it out, or **Delete**.
7. **Feedback** from users appears at the bottom of the same page.

Good habit: update fuel twice a month, and everything else at the start of each season (March, June, September, December).

## Step 10: Turn on visitor counts

In Vercel, open your project → **Analytics** → **Enable**. You'll see how many people visit, from which countries and on which devices. It uses no cookies and is free on the Hobby plan up to a monthly limit.

Crash reports appear automatically under **Logs** (search for `safarco client error`).

## Step 11 (optional): Booking.com affiliate

**Check prices** buttons already open Booking.com with real, live prices for your dates. Joining Booking.com's free affiliate programme means you earn a small commission when someone books, at no cost to them.

1. Apply at **booking.com/affiliate-program**. Approval is up to Booking.com and can take a few weeks; a live site with real visitors helps.
2. Once approved, copy your affiliate ID (**aid**, a number) and add it in Vercel as `VITE_BOOKING_AID`. Then redeploy.

Showing Booking.com prices *inside* SafarCo needs their separate Demand API, which they give only to larger partners. Ask about it once you have regular traffic.

## Step 12: Install it on a phone

- **iPhone:** open the site in **Safari**, tap the **Share** button, then **Add to Home Screen**.
- **Android:** open the site in **Chrome**, tap the **⋮** menu, then **Install app** (or **Add to Home screen**).

It then opens full screen like a normal app. On the **Offline** tab, **Download for offline** saves the route's map for areas with no signal.

Share the link anywhere: WhatsApp, Facebook, a QR code. People can use it straight away in their browser.

## Step 13 (optional): List it on Google Play

A web app like SafarCo can be wrapped as an Android app without new code. Google charges a **one-time US$25** to open a developer account.

1. Create a **Google Play Console** account at **play.google.com/console** and pay the fee. Identity checks can take a few days.
2. Go to **pwabuilder.com**, paste your Vercel address and click **Start**. Then choose **Package for stores → Android** and download the package.
3. The package contains a file called `assetlinks.json`. **Send it to me** and I'll add it to the app, so Android trusts that the store app and your website belong together.
4. In Play Console, create the app, upload the `.aab` file from the package, and fill in the store listing (screenshots, description, privacy policy). PWABuilder's download includes step-by-step notes.

**Apple's App Store** needs a US$99 a year developer account and is stricter about web-based apps. Adding to the home screen (step 12) is the free way for iPhone users.

## Keeping it free

| Limit | What happens if you hit it |
|---|---|
| Vercel Hobby plan: for personal, non-commercial projects, with generous monthly traffic | Vercel will ask you to upgrade. Fine as long as SafarCo stays free and ad-free. |
| Open-Meteo weather: free for non-commercial use | Same condition as above. |
| OpenRouteService: ~2,000 routes a day | New routes fall back to SafarCo's built-in road table for the rest of the day. |
| Geoapify: 3,000 credits a day | Searches fall back to the built-in city list; hotels fall back to sample picks. |
| Supabase free plan: 500 MB database, 50,000 monthly users | Plenty for years of trips. Free projects pause after a week with no visitors; open the site or Supabase dashboard to wake it. |

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
| "Continue with Google" shows an error | Check step 8: the Google redirect URI must be exactly Supabase's Callback URL, the app must be **published**, and Supabase's Site URL must be your Vercel address. |
| Signed in, but trips don't appear on another phone | Make sure both phones use the same Google account, then open **My trips**. Trips sync when you sign in or save. |
| /admin says you aren't an admin | Run the `insert into public.admins` line from step 7 with exactly the email you sign in with. |
| Changed a `VITE_` setting but nothing changed | `VITE_` settings are built into the site; redeploy after changing them. |
