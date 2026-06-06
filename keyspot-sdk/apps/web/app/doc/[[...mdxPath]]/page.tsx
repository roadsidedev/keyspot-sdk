import { generateStaticParamsFor, importPage } from 'nextra/pages'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata({ params }: { params: Promise<{ mdxPath: string[] }> }) {
  const { mdxPath } = await params
  const { metadata } = await importPage(mdxPath)
  return metadata
}

export default async function Page({ params, ...props }: { params: Promise<{ mdxPath: string[] }> }) {
  const { mdxPath } = await params
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(mdxPath)
  return <MDXContent {...props} params={mdxPath} />
}
