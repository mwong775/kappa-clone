# Kappa Poll

Kappa Poll is an integrated solution for streamers to create polls for viewers to interact with the stream in a meaningful way. The UI is simple, intuitive, and visually attractive for both the streamer and viewer.

## Requirements

1. node
2. npm
3. postgresql

### Local Development

If you're wanting to develop this locally, use the below instructions.
To use this, simply clone the repository into the folder of your choice.

For example, to clone this into a `kappa-clone` folder, simply run the following in a commandline interface:
```
git clone https://github.com/mwong775/kappa-clone
```

Next, do the following:

1. Change directories into the cloned folder.
2. Run `npm install` to install all prerequisite packages needed to run the template.
3. Create the required tables (commands can be found in the backend.js file) `psql -U postgres -d kappoll`
4. Create a postgres user with the appropriate username/password and update the config in the /service/backend.js file.
5. Start a postgres server using `pg_ctl -D <data_dir> start`
6. Start the frontend and backend in the twitch developer rig

## Building Production Files

To build the finalized React JS files, simply run `npm run build` to build the various webpacked files. These files will use code splitting to only load in the libraries needed for that view, while still allowing you to reuse components.

### Webpack Config

The Webpack config is stored under `/webpack.config.js`. Adjust the config to disable building code for unneeded extension views. To do so, simply turn the `build` attribute on the path to `false`.

Additionally, feel free to modify the code as needed to add either additional plugins (via modifying the plugins variable at the top) or simply adjusting/tuning the output from Webpack.

### Authentication

There is a basic Authentication class included in this boilerplate to handle simple use-cases for tokens/JWTs.

It is important to note that this class does not validate that the token is legitimate, and instead should only be used for presentational purposes.

## File Structure

The file structure in the template is laid out with the following:

### dist

`/dist` holds the final JS files after building.

### public

`/public` houses the static HTML files used for our code's entrypoint.

### src

This folder houses all source code and relevant files (such as images). Each React class/component is given a folder to house all associated files (such as associated CSS).

Below this folder, the structure is much simpler.

This would be:

```
components\
-\App\
--\App.js
--\App.test.js
--\App.css
-\Authentication\
--\Authentication.js
...
-\static\
--\images
---\sample_image.jpeg
```

Each component is under the `components` folder.
