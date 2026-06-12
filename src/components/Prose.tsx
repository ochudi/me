// Long-form body wrapper: serif headings, sans body at 17/1.7, mono code,
// hairline blockquote rule. Element styles target rendered MDX, which
// cannot carry classes itself.
export default function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-w-2xl text-body
        [&_p]:mt-5 first:[&_p]:mt-0
        [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-h2
        [&_h3]:mt-10 [&_h3]:font-serif [&_h3]:text-h3
        [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-5
        [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-5
        [&_li]:mt-2
        [&_blockquote]:mt-8 [&_blockquote]:border-l [&_blockquote]:border-rule [&_blockquote]:pl-6 [&_blockquote]:text-muted
        [&_code]:font-mono [&_code]:text-[0.8125rem]
        [&_figure]:mt-6 [&_figure]:border [&_figure]:border-rule
        [&_pre]:overflow-x-auto
        [&_a]:underline [&_a]:underline-offset-4
        [&_hr]:mt-12 [&_hr]:border-rule
        [&_em]:font-serif [&_em]:italic"
    >
      {children}
    </div>
  );
}
