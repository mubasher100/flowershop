"use client"

import Accordion from "./accordion"

/**
 * Product accordions.
 *
 * Replaces the starter's "Product Information / Shipping & Returns" pair,
 * which listed weight, dimensions and country of origin — specs that mean
 * nothing for a bouquet — alongside generic returns copy.
 *
 * These three answer what people actually hesitate over before buying
 * flowers: will they last, when will they arrive, and how do I pay.
 */
const ProductTabs = () => {
  const tabs = [
    { label: "Flower care", component: <FlowerCareTab /> },
    { label: "Delivery", component: <DeliveryTab /> },
    { label: "Payment", component: <PaymentTab /> },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          <Accordion.Item
            key={tab.label}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const listClass = "flex flex-col gap-2 text-sm leading-relaxed text-ink-600"

const FlowerCareTab = () => (
  <div className="py-3">
    <ul className={listClass}>
      <li>Trim 2cm off each stem at an angle before putting them in water.</li>
      <li>Change the water every two days, and re-trim while you do.</li>
      <li>Keep them out of direct sun and away from air conditioning vents.</li>
      <li>
        Keep them away from ripening fruit — it gives off ethylene, which makes
        petals drop early.
      </li>
      <li>Strip any leaves that would sit below the waterline.</li>
    </ul>
  </div>
)

const DeliveryTab = () => (
  <div className="py-3">
    <ul className={listClass}>
      <li>
        <span className="font-medium text-ink-800">Same-day across Doha</span> —
        order before 6pm and it arrives today.
      </li>
      <li>Choose a two-hour window at checkout, any time from 10am to 9pm.</li>
      <li>
        Every arrangement is made the morning it goes out. Nothing sits in a
        fridge waiting for an order.
      </li>
      <li>
        We&apos;ll message you on WhatsApp to confirm before the courier leaves.
      </li>
    </ul>
  </div>
)

const PaymentTab = () => (
  <div className="py-3">
    <ul className={listClass}>
      <li>Nothing is charged when you place the order.</li>
      <li>
        We check the flowers are in stock, then confirm the order and payment
        with you on WhatsApp.
      </li>
      <li>Card payment is coming soon.</li>
    </ul>
  </div>
)

export default ProductTabs
