import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);
      const stock: Stock = stockResponse.data;

      const itemInCart = cart.find((product) => product.id === productId);

      if (itemInCart) {
        if (itemInCart.amount >= stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updateProductAmount({
          productId: productId,
          amount: itemInCart.amount + 1,
        });
      } else {
        if (stock.amount >= 1) {
          const productResponse = await api.get(`products/${productId}`);
          const product: Product = productResponse.data;

          const newCartItem = {
            ...product,
            amount: 1,
          };
          setCart([...cart, newCartItem]);
        } else {
          toast.error('Erro na adição do produto');
          return;
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const itemIndex = cart.find((item) => item.id === productId);
      if (!itemIndex) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const filteredCartItems = cart.filter((item) => item.id !== productId);
      setCart(filteredCartItems);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get(`stock/${productId}`);
      const stock: Stock = stockResponse.data;

      // Verificar se existe no estoque a quantidade desejada do produto.
      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // atualizar quantidades no carrinho
      const newCartItemAmount = cart.map((item) => {
        if (item.id === productId) {
          return { ...item, amount: amount };
        }
        return item;
      });
      setCart(newCartItemAmount);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        removeProduct,
        updateProductAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
