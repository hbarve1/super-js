import { sjs } from '../../src/runtime/jsx';

interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
}

interface BlogProps {
  articles: Article[];
}

function ArticleCard({ title, content, author, date }: Article) {
  return (
    <article className="article">
      <h2>{title}</h2>
      <div className="metadata">
        <span className="author">By {author}</span>
        <span className="date">{date}</span>
      </div>
      <div className="content">
        {content}
      </div>
    </article>
  );
}

function Blog({ articles }: BlogProps) {
  return (
    <div className="blog">
      <header>
        <h1>My Blog</h1>
        <p className="subtitle">Welcome to my server-rendered blog!</p>
      </header>
      <main>
        {articles.map(article => (
          <ArticleCard key={article.id} {...article} />
        ))}
      </main>
      <footer>
        <p>© 2024 My Blog. Built with super.js</p>
      </footer>
    </div>
  );
}

// Sample data (in a real app, this would come from a database)
const articles: Article[] = [
  {
    id: 1,
    title: 'Getting Started with super.js',
    content: 'super.js is a modern JavaScript superset that includes built-in JSX support...',
    author: 'Jane Developer',
    date: '2024-03-15'
  },
  {
    id: 2,
    title: 'Server-Side Rendering with JSX',
    content: 'One of the great features of super.js is its ability to render JSX on the server...',
    author: 'John Coder',
    date: '2024-03-16'
  }
];

// Server-side rendering example
function renderPage() {
  const blogContent = <Blog articles={articles} />;
  
  // Convert the JSX to an HTML string
  const content = blogContent.toString();
  
  // Wrap in a full HTML document
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog</title>
    <style>
        .blog {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .article {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 5px;
        }
        .metadata {
            color: #666;
            font-size: 0.9em;
            margin: 10px 0;
        }
        .metadata span {
            margin-right: 15px;
        }
        footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`.trim();

  return html;
}

// In a real server environment, you would use this with your server framework
// For example, with Express:
//
// app.get('/', (req, res) => {
//   res.send(renderPage());
// });

// For this example, we'll just log the output
console.log(renderPage()); 