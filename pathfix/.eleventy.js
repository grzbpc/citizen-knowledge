module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  return {
    pathPrefix: "/citizen-knowledge/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    }
  };
};
