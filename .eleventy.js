module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");

  eleventyConfig.addFilter("dateStr", function(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
  });

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      const dateDiff = new Date(b.data.date) - new Date(a.data.date);
      if (dateDiff !== 0) return dateDiff;

      const orderA = (a.data.order !== undefined) ? a.data.order : 999;
      const orderB = (b.data.order !== undefined) ? b.data.order : 999;
      return orderA - orderB;
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
