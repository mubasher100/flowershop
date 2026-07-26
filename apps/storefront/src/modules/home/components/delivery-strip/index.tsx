/**
 * Delivery reassurance strip.
 *
 * Sits directly under the hero because in flower gifting the blocking question
 * is almost never "is it pretty" — it is "will it arrive in time". Answering
 * that before the product rails is the single highest-value thing above the
 * fold.
 */

const PROMISES = [
  {
    title: "Same-day across Doha",
    detail: "Order by 6pm, delivered today.",
  },
  {
    title: "Choose the hour",
    detail: "Two-hour delivery windows, 10am to 9pm.",
  },
  {
    title: "Arranged to order",
    detail: "Nothing sits in a fridge waiting.",
  },
  {
    title: "Free gift note",
    detail: "Handwritten and sealed, at no charge.",
  },
]

const DeliveryStrip = () => {
  return (
    <section className="border-y border-ink-200/70 bg-white">
      <div className="content-container py-6 small:py-8">
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 small:mx-0 small:grid small:grid-cols-4 small:gap-6 small:overflow-visible small:px-0">
          {PROMISES.map((promise) => (
            <li
              key={promise.title}
              className="w-[13rem] flex-none snap-start rounded-xl bg-blush-50 p-4 small:w-auto small:bg-transparent small:p-0"
            >
              <p className="text-sm font-semibold text-ink-900">
                {promise.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-600">
                {promise.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default DeliveryStrip
