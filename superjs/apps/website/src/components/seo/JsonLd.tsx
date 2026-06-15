type Schema = Record<string, unknown>

/**
 * Renders a schema.org JSON-LD `<script>`. `<` is escaped so structured data
 * can't break out of the script tag.
 */
export function JsonLd({ data }: { data: Schema | Schema[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
