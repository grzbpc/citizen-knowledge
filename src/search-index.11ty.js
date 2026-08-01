exports.data = {
  permalink: "/search-index.json",
  eleventyExcludeFromCollections: true
};

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateStr(date) {
  var d = new Date(date);
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

exports.render = function (data) {
  var posts = data.collections.posts || [];

  var index = posts.map(function (post) {
    var pd = post.data;
    var format = pd.deep_read
      ? "deep"
      : (pd.layout === "brief-post.njk" ? "brief" : "standard");

    return {
      title: pd.title || "",
      url: post.url,
      date: dateStr(pd.date),
      source: pd.source || "",
      description: pd.description || "",
      part: pd.part || "",
      partTitle: pd.partTitle || "",
      chapter: pd.chapter || "",
      chapterTitle: pd.chapterTitle || "",
      subheading: pd.subheading || "",
      format: format,
      counter: !!pd.counter,
      body: stripTags(post.templateContent)
    };
  });

  return JSON.stringify(index);
};